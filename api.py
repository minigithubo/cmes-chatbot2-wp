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
    # Startup: Load docs and setup Chroma once
    print("Initializing RAG system...")
    docs = load_docs()
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
        # Reuse your existing query_rag function
        answer = query_rag(app_state["collection"], request.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run on localhost port 8000
    uvicorn.run(app, host="127.0.0.1", port=8000)