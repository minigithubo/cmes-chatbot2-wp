import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# 1. Documents (chunks)
# -------------------------
documents = [
    {
        "id": "logistics_desc",
        "text": (
            "Page: Logistics\n"
            "Section: Description\n"
            "The unique technology of CMES, which is capable of recognizing atypical products, "
            "enables replacement of the highly-intensive and dangerous work that repeatedly occur "
            "in the logistics worksite, leading to increased safety and work efficiency in the work environment."
        ),
        "meta": {"page": "Logistics", "section": "Description"}
    },
    {
        "id": "logistics_standalone",
        "text": (
            "Page: Logistics\n"
            "Section: Standalone Palletizing and De-palletizing Solution\n"
            "CMES offers a ready-to-use, standalone platform for automating pallet loading and unloading. "
            "It supports rapid deployment within hours, handles diverse case configurations, provides a "
            "turnkey off-the-shelf system with minimal setup, boosts warehouse throughput, and reduces "
            "manual handling in pallet operations."
        ),
        "meta": {"page": "Logistics", "section": "Standalone Palletizing"}
    },
    {
        "id": "logistics_mixed_case",
        "text": (
            "Page: Logistics\n"
            "Section: Mixed Case Palletizing\n"
            "CMES mixed case palletizing, powered by AI 3D vision, enhances efficiency, reduces labor costs, "
            "improves accuracy, and boosts workplace safety. It speeds up palletizing cycles, minimizes "
            "product damage, and ensures consistent stacking patterns."
        ),
        "meta": {"page": "Logistics", "section": "Mixed Case Palletizing"}
    },
    {
        "id": "logistics_random_box",
        "text": (
            "Page: Logistics\n"
            "Section: Random Box Depalletizing\n"
            "The CMES random case depalletizing solution efficiently handles complex logistic products of "
            "various sizes, shapes, and textures within fulfillment centers."
        ),
        "meta": {"page": "Logistics", "section": "Random Box Depalletizing"}
    }
]

# -------------------------
# 2. Chroma client
# -------------------------
client = chromadb.Client(
    Settings(
        persist_directory="./chroma",
        anonymized_telemetry=False
    )
)

# -------------------------
# 3. Embedding function
# -------------------------
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# -------------------------
# 4. Collection
# -------------------------
collection = client.get_or_create_collection(
    name="website_docs",
    embedding_function=embedding_fn
)

# -------------------------
# 5. Ingest documents
# -------------------------
if collection.count() == 0:
    for doc in documents:
        collection.add(
            documents=[doc["text"]],
            metadatas=[doc["meta"]],
            ids=[doc["id"]]
        )

print("Documents embedded and stored.")

# -------------------------
# 6. Similarity search
# -------------------------
query = "How does CMES improve safety in logistics?"

results = collection.query(
    query_texts=[query],
    n_results=3
)

retrieved_chunks = results["documents"][0]

# -------------------------
# 7. Build RAG prompt
# -------------------------
context = "\n\n".join(retrieved_chunks)

prompt = f"""
You must answer the question using ONLY the information in the context below.
If the answer is not present, respond exactly with:
"Not found in provided context."

Context:
{context}

Question:
{query}
"""

# -------------------------
# 8. Call LLM
# -------------------------

llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = llm.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    temperature=0
)

print("\nLLM Answer:")
print(response.choices[0].message.content)
