import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# 1. Documents (Company Info FAQs)
# -------------------------
documents = [
    {
        "id": "faq_industries",
        "text": (
            "Question: What industries do you serve?\n"
            "Answer: CMES Robotics provides automation solutions across a wide range of industries, "
            "including logistics, e-commerce, manufacturing, food and beverage, and consumer packaged goods. "
            "Our systems are designed to adapt to different production environments and operational requirements."
        ),
        "meta": {"category": "Industries", "topic": "Service Range"}
    },
    {
        "id": "faq_partners",
        "text": (
            "Question: What brands do you partner with?\n"
            "Answer: We work with globally recognized robot manufacturers and automation technology partners. "
            "The specific brands and configurations are selected based on the application requirements "
            "to ensure optimal performance and reliability."
        ),
        "meta": {"category": "Partnerships", "topic": "Brands"}
    },
    {
        "id": "faq_capabilities",
        "text": (
            "Question: What does CMES Robotics do?\n"
            "Answer: CMES Robotics designs and integrates customized robotic automation solutions. "
            "Our services include system design, robot integration, vision systems, software development, "
            "and full project delivery from concept to commissioning."
        ),
        "meta": {"category": "Capabilities", "topic": "Services"}
    },
    {
        "id": "faq_benefits",
        "text": (
            "Question: How do your automation solutions help?\n"
            "Answer: Our automation solutions help companies improve productivity, reduce labor dependency, "
            "increase operational consistency, and enhance workplace safety. Each solution is tailored "
            "to meet the customer’s throughput, space, and process requirements."
        ),
        "meta": {"category": "Benefits", "topic": "Value Proposition"}
    }
]

# -------------------------
# 1. Documents (Engineering FAQs)
# -------------------------
engineering_docs = [
    {
        "id": "eng_robot_types",
        "text": (
            "Question: What kind of robots are you using?\n"
            "Answer: We utilize industrial robots from leading global manufacturers, including "
            "articulated robots, collaborative robots, and specialized picking robots. The robot "
            "type is selected based on payload, speed, reach, and application needs."
        ),
        "meta": {"category": "Engineering", "topic": "Robot Hardware"}
    },
    {
        "id": "eng_throughput",
        "text": (
            "Question: How many boxes can you handle per hour?\n"
            "Answer: Throughput depends on factors such as box size, weight, robot type, and "
            "system layout. In many applications, our systems can handle several hundred to "
            "over a thousand boxes per hour. Exact performance is determined during system "
            "design and testing."
        ),
        "meta": {"category": "Engineering", "topic": "Performance"}
    },
    {
        "id": "eng_integration",
        "text": (
            "Question: What robots do you integrate?\n"
            "Answer: We integrate robots from multiple major robot brands and are not limited "
            "to a single manufacturer. This allows us to recommend the most suitable robot "
            "platform based on the specific application and customer requirements."
        ),
        "meta": {"category": "Engineering", "topic": "Integration"}
    },
    {
        "id": "eng_loose_bag",
        "text": (
            "Question: Do you offer a robotic palletizing/depalletizing solution for a loose bag?\n"
            "Answer: Yes, we offer robotic palletizing and depalletizing solutions for loose bags. "
            "These systems are designed with appropriate grippers and vision technologies to "
            "handle variations in bag shape, weight, and positioning."
        ),
        "meta": {"category": "Engineering", "topic": "Specialized Solutions"}
    },
    {
        "id": "eng_sku_handling",
        "text": (
            "Question: For a piece picking robot, how many different SKU does it handle?\n"
            "Answer: The number of SKUs that can be handled depends on the vision system, "
            "gripper design, and product variation. Our piece picking solutions are capable "
            "of handling a wide range of SKUs, and the exact capacity is defined based on "
            "the project requirements."
        ),
        "meta": {"category": "Engineering", "topic": "Piece Picking"}
    },
    {
        "id": "eng_pick_speed",
        "text": (
            "Question: What is the pick up speed per hour?\n"
            "Answer: Pick speed varies depending on product characteristics, robot configuration, "
            "and system design. Typical pick rates range from several hundred to over a thousand "
            "picks per hour. Performance is validated through system testing and simulation."
        ),
        "meta": {"category": "Engineering", "topic": "Performance"}
    }
]

# -------------------------
# 1. Documents (Sales Lead FAQs)
# -------------------------
sales_lead_docs = [
    {
        "id": "sales_demo",
        "text": (
            "Question: Where can I see a demo?\n"
            "Answer: You can see a demo by scheduling a visit to our demonstration facility or by requesting a virtual demonstration. "
            "Please contact our team to arrange a demo that matches your application."
        ),
        "meta": {"category": "Sales", "topic": "Demos"}
    },
    {
        "id": "sales_quote",
        "text": (
            "Question: How can I request a quote?\n"
            "Answer: To request a quote, please contact our sales team through the website or "
            "provide your application details via the contact form. Our team will review your "
            "requirements and follow up with a customized proposal."
        ),
        "meta": {"category": "Sales", "topic": "Quoting"}
    },
    {
        "id": "sales_lead_time",
        "text": (
            "Question: What is the lead time?\n"
            "Answer: Lead time varies depending on system complexity, component availability, "
            "and project scope. After reviewing your application details, we can provide an "
            "estimated lead time tailored to your project."
        ),
        "meta": {"category": "Sales", "topic": "Lead Time"}
    },
    {
        "id": "sales_delivery_palletizer",
        "text": (
            "Question: What is a delivery time of robotic palletizer?\n"
            "Answer: Delivery time for a robotic palletizer depends on the system configuration "
            "and project requirements. Typical delivery timelines are discussed during the "
            "project planning phase after specifications are finalized."
        ),
        "meta": {"category": "Sales", "topic": "Delivery"}
    }
]

# -------------------------
# 2. Chroma client
# -------------------------
client = chromadb.Client(
    Settings(
        persist_directory="./chroma_company",
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
    name="company_info_docs",
    embedding_function=embedding_fn
)

# -------------------------
# 5. Ingest documents (include all FAQ groups)
# -------------------------
all_docs = documents + engineering_docs + sales_lead_docs

if collection.count() == 0:
    for doc in all_docs:
        collection.add(
            documents=[doc["text"]],
            metadatas=[doc["meta"]],
            ids=[doc["id"]]
        )

print("Company Info embedded and stored.")

# -------------------------
# 6. Similarity search
# -------------------------
query = "Where can I see a demo?"

results = collection.query(
    query_texts=[query],
    n_results=2
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