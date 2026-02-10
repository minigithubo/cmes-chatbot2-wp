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


def load_docs(filepath="docs.json"):
    """Load documents from docs.json"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("documents", [])
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        sys.exit(1)


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


def query_rag(collection, question, n_results=3):
    """Query Chroma and get LLM response"""
    # Retrieve relevant chunks
    results = collection.query(query_texts=[question], n_results=n_results)
    retrieved_chunks = results.get("documents", [[]])[0]

    if not retrieved_chunks:
        print("No relevant documents found.")
        return

    # Build context
    context = "\n\n".join(retrieved_chunks)

    # Build prompt
    prompt = f"""You must answer the question using ONLY the information in the context below.
If the answer is not present, respond exactly with:
"Not found in provided context."

Context:
{context}

Question:
{question}"""

    # Call LLM
    llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = llm.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    return response.choices[0].message.content


def main():
    # Load docs
    docs = load_docs()
    print(f"Loaded {len(docs)} documents from docs.json\n")

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
    answer = query_rag(collection, question)
    print(f"Answer: {answer}")


if __name__ == "__main__":
    main()