# api.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from chat import load_docs, setup_chroma, ingest_docs, query_rag  # Import functions from your existing script

# Global variables to hold the app state
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load docs (docs.json + whitepaper.json) and setup Chroma once
    print("Initializing RAG system...")
    docs = load_docs()  # loads from chat.RAG_DOC_SOURCES
    client, collection = setup_chroma()
    ingest_docs(collection, docs)
    
    app_state["collection"] = collection
    print("RAG system ready.")
    yield
    # Shutdown: Clean up if necessary
    print("Shutting down.")

app = FastAPI(lifespan=lifespan)

class QueryRequest(BaseModel):
    question: str

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    if not request.question:
        raise HTTPException(status_code=400, detail="No question provided")
    
    try:
        # Semantic search (Chroma embeddings) + LLM; returns answer + sources
        result = query_rag(app_state["collection"], request.question)
        return {"answer": result["answer"], "sources": result.get("sources", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)