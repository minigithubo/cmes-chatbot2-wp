#!/usr/bin/env python3
import os
import ast
import sys
from dotenv import load_dotenv
load_dotenv()

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions


def extract_docs_from_file(path, varnames):
    try:
        src = open(path, "r", encoding="utf-8").read()
    except Exception as e:
        print(f"Could not read {path}: {e}")
        return []

    try:
        tree = ast.parse(src, filename=path)
    except Exception as e:
        print(f"Could not parse {path}: {e}")
        return []

    docs = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in varnames:
                    try:
                        value_obj = ast.literal_eval(node.value)
                        if isinstance(value_obj, list):
                            docs.extend(value_obj)
                    except Exception as e:
                        print(f"Could not evaluate {target.id} in {path}: {e}")
    return docs


def main():
    root = os.getcwd()
    py_files = [f for f in os.listdir(root) if f.endswith('.py') and f != os.path.basename(__file__)]

    varnames = {"documents", "engineering_docs", "sales_lead_docs"}
    all_docs = []

    for f in py_files:
        path = os.path.join(root, f)
        found = extract_docs_from_file(path, varnames)
        if found:
            print(f"Found {len(found)} docs in {f}")
            all_docs.extend(found)

    if not all_docs:
        print("No document lists found in workspace .py files.")
        sys.exit(1)

    client = chromadb.Client(
        Settings(persist_directory="./chroma_all", anonymized_telemetry=False)
    )

    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    collection = client.get_or_create_collection(
        name="combined_docs",
        embedding_function=embedding_fn
    )

    if collection.count() == 0:
        for doc in all_docs:
            collection.add(
                documents=[doc.get("text")],
                metadatas=[doc.get("meta", {})],
                ids=[doc.get("id")]
            )

    print(f"Indexed {len(all_docs)} documents into 'combined_docs' (persist: ./chroma_all)")

    # quick verification
    query = "Where can I see a demo?"
    results = collection.query(query_texts=[query], n_results=3)
    retrieved = results.get("documents", [[]])[0]
    print("\nTop retrieved chunks:")
    for i, r in enumerate(retrieved, 1):
        snippet = r.replace('\n', ' ')[:300]
        print(f"{i}. {snippet}")


if __name__ == '__main__':
    main()
