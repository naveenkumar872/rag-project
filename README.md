# Smart Knowledge - AI Confidence Meter

An intelligent document Q&A system that answers user questions with **confidence scoring**, powered by Qdrant vector search and Groq LLM.

## 🎯 Features

- **Intelligent Q&A**: Upload documents and ask questions via natural language
- **Confidence Scoring**: Get confidence percentages for each answer (0-100%)
- **Confidence Categories**: Answers labeled as "High", "Medium", "Low", or "No Answer"
- **Weak Context Detection**: Identifies when answers are based on weak document context
- **PDF Support**: Upload and process PDF documents
- **Document Management**: Track uploaded files and collection statistics
- **Responsive UI**: Modern, mobile-friendly interface with Tailwind CSS
- **Offline Mode**: Indication when backend is unavailable

## 🏗️ Architecture

### Backend (Python)
- **Framework**: FastAPI
- **Vector Database**: Qdrant Cloud
- **LLM**: Groq (llama-3.3-70b-versatile)
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Document Processing**: PyPDF2, docx2txt

### Frontend (React)
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## 📋 Requirements

### Backend
- Python 3.10+
- Groq API Key
- Qdrant Cloud account (URL & API Key)

### Frontend
- Node.js 18+
- npm/pnpm/bun

## 🚀 Getting Started

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables** (create `.env`)
```env
GROQ_API_KEY=your_groq_api_key
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

5. **Start the server**
```bash
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
# or
bun install
```

3. **Start development server**
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

## 📚 API Endpoints

### Query Endpoint
```
POST /query
{
  "question": "What is the capital of France?",
  "top_k": 5,
  "threshold": 40.0
}
```

**Response**:
```json
{
  "answer": "Paris",
  "confidence": 95,
  "label": "High",
  "weak_context": false,
  "no_answer_mode": false,
  "top_chunks": ["France's capital is Paris..."]
}
```

### Document Upload
```
POST /upload
FormData: file (PDF/DOCX)
```

### Collection Stats
```
GET /stats
```

## ⚙️ Configuration

Key settings in `backend/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `CHUNK_SIZE` | 300 words | Document chunk size |
| `CHUNK_OVERLAP` | 50 words | Overlap between chunks |
| `DEFAULT_TOP_K` | 5 | Retrieved chunks per query |
| `DEFAULT_THRESHOLD` | 40.0 | Minimum confidence to answer (%) |
| `RELEVANCE_CUTOFF` | 0.80 | Filter weak chunks |
| `LLM_TEMPERATURE` | 0.2 | LLM creativity (0-1) |

## 🔄 How It Works

1. **Document Upload**: PDF/DOCX files are chunked and embedded using sentence-transformers
2. **Vector Storage**: Embeddings stored in Qdrant Cloud
3. **Query Processing**: User questions are embedded and searched against the knowledge base
4. **Answer Generation**: Top-K relevant chunks are sent to Groq LLM with system prompts
5. **Confidence Scoring**: Answer confidence calculated from retrieval similarity scores
6. **Response**: Frontend displays answer with confidence meter and category label

## 🛠️ Development

### Running Tests
```bash
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend is ready to deploy with uvicorn or any ASGI server
```

### Code Structure
```
backend/
├── main.py           # FastAPI app & routes
├── config.py         # Configuration & environment vars
├── models.py         # Pydantic data models
├── services.py       # Core logic (embedding, chunking, scoring)
└── requirements.txt  # Python dependencies

frontend/
├── src/
│   ├── components/   # React components (Chat, Upload, etc.)
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # API client & utilities
│   └── pages/        # Page components
└── package.json      # Node dependencies
```

## 📝 Environment Variables

Create `.env` in the root or backend directory:

```env
# Groq
GROQ_API_KEY=sk_xxxxxxxxxxxx

# Qdrant Cloud
QDRANT_URL=https://your-qdrant-cluster.qdrant.io
QDRANT_API_KEY=xxxxxxxxxxxxxx

# Frontend (optional)
VITE_API_URL=http://localhost:8000
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Currently unlicensed. Please check with the project maintainers.

## 📞 Support

For issues or questions, please open an issue on the repository.

---

**Version**: 0.1  
**Last Updated**: March 2026
