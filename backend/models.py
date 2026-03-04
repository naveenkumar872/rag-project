from pydantic import BaseModel
from typing import Optional


# ─── Request Models ───────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question:  str
    top_k:     Optional[int]   = 5      # chunks to retrieve
    threshold: Optional[float] = 40.0   # weak-context cutoff (0-100)


# ─── Response Models ──────────────────────────────────────────────────────────

class QueryResponse(BaseModel):
    answer:        str
    confidence:    float        # R1 – normalised 0-100
    label:         str          # R2 – High / Medium / Low / Very Low
    weak_context:  bool         # R3 – True when score < threshold
    no_answer_mode: bool        # R4 – True when LLM was blocked
    top_chunks:    list[str]    # R5 – chunks shown in UI


class DocumentResponse(BaseModel):
    message:      str
    chunks_added: int
    filename:     str


class CollectionStatsResponse(BaseModel):
    total_vectors:   int
    collection_name: str
