# CMES Chatbot RAG API
FROM python:3.11-slim

WORKDIR /app

# Install system deps for sentence-transformers (optional, can speed up first run)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py chat.py docs.json whitepaper.json ./

ENV HOST=0.0.0.0
ENV PORT=8000
EXPOSE 8000

# OPENAI_API_KEY must be set at runtime (docker run -e OPENAI_API_KEY=... or in compose)
CMD ["python", "api.py"]
