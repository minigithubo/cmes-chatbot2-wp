#!/usr/bin/env python3
import json
import sys
import os
from dotenv import load_dotenv

load_dotenv()

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from openai import OpenAI


# JSON sources for RAG retrieval (each must have a "documents" array)
RAG_DOC_SOURCES = ["docs.json", "whitepaper.json"]


def load_docs(filepath=None):
    """Load documents from one or more JSON files for RAG. Each file must have a "documents" key."""
    paths = [filepath] if filepath else RAG_DOC_SOURCES
    all_docs = []
    for path in paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                docs = data.get("documents", [])
                all_docs.extend(docs)
                if not filepath:
                    print(f"  Loaded {len(docs)} documents from {path}")
        except FileNotFoundError:
            print(f"  Skipping {path} (file not found)")
        except Exception as e:
            print(f"  Error loading {path}: {e}")
    if not all_docs:
        print("No documents loaded from any source.")
        sys.exit(1)
    return all_docs


def setup_chroma():
    """Initialize Chroma client and collection"""
    client = chromadb.Client(
        Settings(persist_directory="./chroma_chat", anonymized_telemetry=False)
    )

    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    collection = client.get_or_create_collection(
        name="cmes_docs",
        embedding_function=embedding_fn
    )

    return client, collection


def ingest_docs(collection, docs):
    """Ingest documents into Chroma collection"""
    if collection.count() == 0:
        for doc in docs:
            collection.add(
                documents=[doc.get("text")],
                metadatas=[doc.get("meta", {})],
                ids=[doc.get("id")]
            )
        print(f"Indexed {len(docs)} documents into Chroma.")
    else:
        print(f"Collection already contains {collection.count()} documents.")


def expand_query(client, question):
    """Rewrite the question so it matches how our FAQ/docs are phrased (e.g. 'What does CMES Robotics do?'). Same meaning."""
    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": """Our FAQ uses questions like "What does CMES Robotics do?" and "What industries do you serve?". Rewrite the user question in that exact style so it will match our documents. Same meaning. Use "CMES Robotics" not "CMes". Output only the rewritten question, nothing else.

User question: """ + question
            }],
            temperature=0,
            max_tokens=100
        )
        expanded = (r.choices[0].message.content or "").strip()
        return expanded if expanded and expanded.lower() != question.lower() else None
    except Exception:
        return None


def query_rag(collection, question, n_results=10):
    """Semantic search: embed question (and optional expanded phrasing), retrieve similar docs, then LLM."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Query expansion: get an alternative phrasing so natural questions match FAQ-style docs
    expanded = expand_query(client, question)
    queries = [question]
    if expanded:
        queries.append(expanded)

    # Retrieve for each phrasing and merge by doc id (dedupe, preserve order)
    seen_ids = set()
    retrieved_chunks = []
    metadatas = []
    per_query = max(5, (n_results + len(queries) - 1) // len(queries))

    for q in queries:
        results = collection.query(query_texts=[q], n_results=per_query)
        chunks = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        ids = results.get("ids", [[]])[0]
        for i, doc_id in enumerate(ids):
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            retrieved_chunks.append(chunks[i] if i < len(chunks) else "")
            metadatas.append(metas[i] if i < len(metas) else {})

    # Cap total chunks
    retrieved_chunks = retrieved_chunks[:n_results]
    metadatas = metadatas[:n_results]

    if not retrieved_chunks:
        print("No relevant documents found.")
        return {"answer": "No relevant information found in the knowledge base.", "sources": []}

    # Build context from semantically retrieved chunks
    context = "\n\n".join(retrieved_chunks)
    # Sources for the API response (snippet or id for UI)
    sources = []
    for i, chunk in enumerate(retrieved_chunks):
        meta = metadatas[i] if i < len(metadatas) else {}
        label = meta.get("section") or meta.get("topic") or meta.get("id") or f"Source {i + 1}"
        snippet = (chunk[:200] + "…") if len(chunk) > 200 else chunk
        sources.append(snippet)

    prompt = f"""You are the CMES Robotics chatbot on our marketing website. Use only the context below to answer — do not add or invent information that is not there.

Voice and style:
- Speak as the company: use "we", "our", and "us" (not "they", "their", "them").
- Keep answers concise and easy to scan; avoid long paragraphs.
- Answer directly — do not preface with "Based on the context" or "According to our documents."
- When the context supports it, state things clearly; avoid unnecessary hedging ("might", "perhaps", "I think").
- Refer to the company as "we" or "CMES Robotics" / "CMES" as in the context.

If the context has relevant information, answer in a clear, natural way. If nothing in the context is relevant, say so briefly and suggest asking about our solutions, technologies, or industries.

Context:
{context}

Question:
{question}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    answer = response.choices[0].message.content
    return {"answer": answer, "sources": sources}


def main():
    # Load docs (docs.json + whitepaper.json)
    print("Loading documents...")
    docs = load_docs()
    print(f"Total: {len(docs)} documents\n")

    # Setup Chroma
    client, collection = setup_chroma()

    # Ingest
    ingest_docs(collection, docs)

    # Get question from command line or interactive input
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        question = input("\nEnter your question: ").strip()

    if not question:
        print("No question provided.")
        sys.exit(1)

    print(f"\nQuestion: {question}\n")
    out = query_rag(collection, question)
    answer = out["answer"] if isinstance(out, dict) else out
    print(f"Answer: {answer}")


if __name__ == "__main__":
    main()