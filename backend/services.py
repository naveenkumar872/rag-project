import io
import uuid
import requests
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct
import PyPDF2
import docx2txt

from config import (
    GROQ_API_KEY, GROQ_MODEL,
    CHUNK_SIZE, CHUNK_OVERLAP,
    RELEVANCE_CUTOFF,
    LLM_TEMPERATURE, LLM_MAX_TOKENS,
)

# ─── Embedding model (loaded once at import time) ─────────────────────────────
print("Loading embedding model …")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# ══════════════════════════════════════════════════════════════════════════════
#  SCORING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def normalize_score(raw: float) -> float:
    """
    Map cosine similarity to a friendlier 0-100% scale.
    all-MiniLM-L6-v2 good matches typically land in [0.25, 0.65].
    We rescale so that:
      0.00 → 0%    (no similarity)
      0.25 → 35%   (weak)
      0.45 → 65%   (medium)
      0.60 → 85%   (good)
      1.00 → 100%  (perfect)
    Using a simple linear rescale with floor+ceiling clamp.
    """
    # Treat anything below 0.15 as 0, scale [0.15, 0.70] → [0, 100]
    low, high = 0.15, 0.70
    scaled = (float(raw) - low) / (high - low)
    return round(max(0.0, min(100.0, scaled * 100)), 2)


def classify_confidence(score: float) -> str:
    """R2 – turn a score into a human label."""
    if score >= 80:   return "High"
    elif score >= 60: return "Medium"
    elif score >= 40: return "Fair"
    else:             return "Low"


# ══════════════════════════════════════════════════════════════════════════════
#  TEXT PROCESSING
# ══════════════════════════════════════════════════════════════════════════════

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(p.extract_text() or "" for p in reader.pages)

    elif ext in ("docx", "doc"):
        return docx2txt.process(io.BytesIO(file_bytes))

    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")

    else:
        raise ValueError(f"Unsupported file type: .{ext}  —  accepted: pdf, docx, txt")


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words  = text.split()
    chunks = []
    start  = 0
    while start < len(words):
        chunk = " ".join(words[start : start + CHUNK_SIZE])
        if chunk.strip():
            chunks.append(chunk.strip())
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


# ══════════════════════════════════════════════════════════════════════════════
#  EMBEDDING
# ══════════════════════════════════════════════════════════════════════════════

def embed(text: str) -> list[float]:
    """Convert any text into a 384-dim vector."""
    return embedding_model.encode(text).tolist()


def build_points(chunks: list[str], filename: str, label: str) -> list[PointStruct]:
    """Turn a list of text chunks into Qdrant PointStructs ready for upsert."""
    return [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embed(chunk),
            payload={"text": chunk, "source": filename, "label": label},
        )
        for chunk in chunks
    ]


# ══════════════════════════════════════════════════════════════════════════════
#  RETRIEVAL
# ══════════════════════════════════════════════════════════════════════════════

def filter_relevant_chunks(results) -> list[str]:
    """
    Drop chunks whose score falls below RELEVANCE_CUTOFF * top_score.
    Prevents noisy low-relevance chunks from confusing the LLM.
    """
    if not results:
        return []

    scored = sorted(
        [(r.score, r.payload.get("text", "")) for r in results],
        key=lambda x: x[0],
        reverse=True,
    )

    cutoff = scored[0][0] * RELEVANCE_CUTOFF
    filtered = [text for score, text in scored if score >= cutoff]

    # Always return at least the top chunk
    return filtered if filtered else [scored[0][1]]


# ══════════════════════════════════════════════════════════════════════════════
#  LLM
# ══════════════════════════════════════════════════════════════════════════════

def build_prompt(question: str, chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(chunks)
    return f"""You are an intelligent document Q&A assistant with strong reasoning capabilities. Answer the user's question using ONLY the context provided below.

REASONING PROCESS:
1. First, carefully analyze the question to understand what information is being requested.
2. Scan through ALL provided context chunks systematically.
3. Identify relevant facts, relationships, and connections between pieces of information.
4. If the answer requires combining information from multiple chunks, synthesize them logically.
5. Think step-by-step when the question requires reasoning or inference.

RULES:
- Use ONLY information from the provided context — do NOT add external knowledge.
- If the context contains the answer (fully or partially), provide a clear, well-reasoned response.
- For complex questions, show your reasoning briefly before giving the final answer.
- If the context truly lacks relevant information, respond: "This information is not available in the provided documents."
- Be concise but thorough — aim for 2-5 sentences unless deeper explanation is warranted.

CONTEXT:
{context}

QUESTION: {question}

Let me analyze the context and provide a well-reasoned answer:

ANSWER:"""


def call_groq(prompt: str) -> str:
    """Send prompt to Groq LLM and return the answer text."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment.")

    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model":       GROQ_MODEL,
            "messages":    [{"role": "user", "content": prompt}],
            "temperature": LLM_TEMPERATURE,
            "max_tokens":  LLM_MAX_TOKENS,
        },
        timeout=30,
    )

    if not resp.ok:
        try:
            err = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            err = resp.text
        raise HTTPException(status_code=502, detail=f"Groq API error ({resp.status_code}): {err}")

    return resp.json()["choices"][0]["message"]["content"]
