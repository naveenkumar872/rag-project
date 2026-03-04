"""
Smart Knowledge Confidence Meter - FastAPI Backend with Qdrant Cloud
Implements:
- R1: Score normalization (Qdrant cosine similarity to 0-100%)
- R2: Confidence category labels
- R3: Weak context detection
- R4: No-answer mode
- R5: API support for UI score display
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

from config import QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME, VECTOR_SIZE, DEFAULT_TOP_K, DEFAULT_THRESHOLD
from models import QueryRequest, QueryResponse, DocumentResponse, CollectionStatsResponse
from services import (
    extract_text_from_file, chunk_text, embed,
    build_points, filter_relevant_chunks,
    normalize_score, classify_confidence,
    build_prompt, call_groq,
)

# ─── Local uploads folder ─────────────────────────────────────────────────────
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
print(f"📁 Local uploads folder: {UPLOADS_DIR.absolute()}")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Knowledge Confidence Meter API",
    description="Admin uploads documents. Users ask questions with confidence scoring.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Qdrant Cloud connection (once at startup) ───────────────────────────────
print("Connecting to Qdrant Cloud …")
try:
    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )
    qdrant.get_collections()
    print("✅ Qdrant Cloud connected.")
except Exception as e:
    print(f"❌ Qdrant connection failed: {e}")
    sys.exit(1)

existing = [c.name for c in qdrant.get_collections().collections]
if COLLECTION_NAME not in existing:
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    print(f"Collection '{COLLECTION_NAME}' created.")
else:
    print(f"Collection '{COLLECTION_NAME}' already exists — reusing.")


# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/admin/uploads", tags=["Admin"], summary="List all locally saved uploaded files")
def admin_list_uploads():
    files = []
    for p in sorted(UPLOADS_DIR.iterdir()):
        if p.is_file():
            # Strip timestamp prefix YYYYMMDD_HHMMSS_ (16 chars)
            name = p.name
            original = name[16:] if len(name) > 16 and name[8] == "_" and name[15] == "_" else name
            files.append({
                "saved_filename": name,
                "original_filename": original,
                "size_bytes": p.stat().st_size,
                "uploaded_at": datetime.fromtimestamp(p.stat().st_mtime).isoformat(),
            })
    return {"total": len(files), "files": files}


@app.post("/admin/upload", response_model=DocumentResponse, tags=["Admin"],
          summary="Upload PDF / DOCX / TXT to the knowledge base")
async def admin_upload(
    file: UploadFile = File(...),
    source_label: str = Form(default=""),
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Uploaded file is empty.")

    # Duplicate check: reject if the same original filename already exists in uploads/
    for existing in UPLOADS_DIR.iterdir():
        if existing.is_file():
            existing_original = existing.name[16:] if len(existing.name) > 16 and existing.name[8] == "_" and existing.name[15] == "_" else existing.name
            if existing_original.lower() == file.filename.lower():
                raise HTTPException(409, f"File '{file.filename}' has already been uploaded. Delete it first to re-upload.")

    # Save file locally with timestamp prefix
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    local_path = UPLOADS_DIR / safe_filename
    
    try:
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        print(f"✅ Saved locally: {local_path}")
    except Exception as e:
        print(f"⚠️ Failed to save locally: {e}")
        # Continue processing even if local save fails

    try:
        raw_text = extract_text_from_file(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(415, str(e))

    raw_text = raw_text.strip()
    if not raw_text:
        raise HTTPException(422, "No text could be extracted from the file.")

    chunks = chunk_text(raw_text)
    points = build_points(chunks, file.filename, source_label or file.filename)

    # Batch upsert (100 at a time) to handle large files safely
    for i in range(0, len(points), 100):
        qdrant.upsert(collection_name=COLLECTION_NAME, points=points[i:i+100])

    return DocumentResponse(
        message=f"Document saved to uploads/{safe_filename} and vectorised successfully.",
        chunks_added=len(chunks),
        filename=file.filename,
    )


@app.post("/admin/add-text", response_model=DocumentResponse, tags=["Admin"],
          summary="Paste raw text directly into the knowledge base")
def admin_add_text(
    text: str = Form(...),
    source_label: str = Form(default="manual-input"),
):
    text = text.strip()
    if not text:
        raise HTTPException(400, "Text body is empty.")

    chunks = chunk_text(text)
    points = build_points(chunks, "manual", source_label)
    qdrant.upsert(collection_name=COLLECTION_NAME, points=points)

    return DocumentResponse(
        message="Text stored successfully.",
        chunks_added=len(chunks),
        filename="manual-input",
    )


@app.get("/admin/stats", response_model=CollectionStatsResponse, tags=["Admin"],
         summary="How many vectors are stored")
def admin_stats():
    info = qdrant.get_collection(COLLECTION_NAME)
    total = getattr(info, "points_count", None) or getattr(info, "vectors_count", None) or 0
    return CollectionStatsResponse(total_vectors=total, collection_name=COLLECTION_NAME)


@app.delete("/admin/reset", tags=["Admin"], summary="⚠️ Wipe entire knowledge base")
def admin_reset():
    qdrant.delete_collection(COLLECTION_NAME)
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    return {"message": "Collection reset. All documents deleted."}


@app.get("/admin/browse", tags=["Admin"], summary="Browse stored chunks (paginated)")
def admin_browse(limit: int = 10, offset: int = 0):
    limit = min(limit, 100)
    results, next_offset = qdrant.scroll(
        collection_name=COLLECTION_NAME, limit=limit, offset=offset,
        with_payload=True, with_vectors=False,
    )
    chunks = [
        {
            "id":           str(p.id),
            "source":       p.payload.get("source", "unknown"),
            "text_preview": p.payload.get("text", "")[:300],
        }
        for p in results
    ]
    return {"total_shown": len(chunks), "offset": offset, "next_offset": next_offset, "chunks": chunks}


@app.get("/admin/browse/sources", tags=["Admin"], summary="List all uploaded source files")
def admin_sources():
    sources: dict = {}
    offset = None
    while True:
        results, next_offset = qdrant.scroll(
            collection_name=COLLECTION_NAME, limit=100, offset=offset,
            with_payload=True, with_vectors=False,
        )
        for p in results:
            src = p.payload.get("source", "unknown")
            sources[src] = sources.get(src, 0) + 1
        if next_offset is None:
            break
        offset = next_offset
    return {
        "total_sources": len(sources),
        "sources": [{"filename": k, "chunks_stored": v} for k, v in sorted(sources.items())],
    }


@app.get("/admin/browse/search", tags=["Admin"], summary="Keyword search through stored chunks")
def admin_keyword_search(keyword: str, limit: int = 20):
    matches, offset = [], None
    while True:
        results, next_offset = qdrant.scroll(
            collection_name=COLLECTION_NAME, limit=100, offset=offset,
            with_payload=True, with_vectors=False,
        )
        for p in results:
            text = p.payload.get("text", "")
            if keyword.lower() in text.lower():
                matches.append({"id": str(p.id), "source": p.payload.get("source"), "text_preview": text[:300]})
            if len(matches) >= limit:
                break
        if next_offset is None or len(matches) >= limit:
            break
        offset = next_offset
    return {"keyword": keyword, "matches_found": len(matches), "results": matches}


# ══════════════════════════════════════════════════════════════════════════════
#  USER ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/user/ask", response_model=QueryResponse, tags=["User"],
          summary="Ask a question — returns answer + confidence score")
def user_ask(request: QueryRequest):

    # 1. Embed question
    q_vector = embed(request.question)

    # 2. Search Qdrant (supports both old and new qdrant-client versions)
    try:
        response = qdrant.query_points(
            collection_name=COLLECTION_NAME,
            query=q_vector,
            limit=request.top_k,
            with_payload=True,
        )
        results = response.points
    except AttributeError:
        results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=q_vector,
            limit=request.top_k,
        )

    if not results:
        return QueryResponse(
            answer="The knowledge base is empty. Ask an admin to upload documents.",
            confidence=0.0, label="Low",
            weak_context=True, no_answer_mode=True, top_chunks=[],
        )

    # R1 – Normalise raw cosine similarity → 0-100% scale
    top_score = normalize_score(results[0].score)

    # R2 – Assign human-readable confidence label
    label = classify_confidence(top_score)

    all_chunks = [r.payload.get("text", "") for r in results]
    threshold = max(0.0, min(100.0, request.threshold))

    # R3 – Weak context detection: score below threshold means partial/uncertain match
    is_weak_context = top_score < threshold

    # R4 – No-answer mode: only when score is near zero (KB has nothing relevant)
    is_no_answer = top_score < 10

    # Filter irrelevant chunks (use all chunks when context is weak so LLM has more to work with)
    relevant_chunks = filter_relevant_chunks(results) if not is_weak_context else all_chunks

    # R5 – Build prompt + call LLM; structured response carries all score fields for UI display
    prompt = build_prompt(request.question, relevant_chunks)
    answer = call_groq(prompt)

    return QueryResponse(
        answer=answer.strip(),
        confidence=top_score,
        label=label,
        weak_context=is_weak_context,
        no_answer_mode=is_no_answer,
        top_chunks=relevant_chunks,
    )


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
