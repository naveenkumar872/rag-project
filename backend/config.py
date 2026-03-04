import os
from dotenv import load_dotenv

load_dotenv()

# ─── Groq ─────────────────────────────────────────────────────────────────────
GROQ_API_KEY  = os.getenv("GROQ_API_KEY")
GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")  # Strong reasoning model

# ─── Qdrant Cloud ─────────────────────────────────────────────────────────────
QDRANT_URL       = os.getenv("QDRANT_URL")
QDRANT_API_KEY   = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME  = "knowledge_base"
VECTOR_SIZE      = 384          # all-MiniLM-L6-v2 output dimension

# ─── Chunking ─────────────────────────────────────────────────────────────────
CHUNK_SIZE    = 300             # words per chunk
CHUNK_OVERLAP = 50              # overlap between chunks

# ─── Retrieval ────────────────────────────────────────────────────────────────
DEFAULT_TOP_K        = 5        # how many chunks to retrieve
DEFAULT_THRESHOLD    = 40.0     # confidence % below which we refuse to answer
RELEVANCE_CUTOFF     = 0.80     # drop chunks below 80% of top score

# ─── LLM ──────────────────────────────────────────────────────────────────────
LLM_TEMPERATURE  = 0.2          # Slightly higher for reasoning flexibility
LLM_MAX_TOKENS   = 2048         # Allow longer reasoning responses
