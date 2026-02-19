# Hosting CMES Chatbot on the Cloud

Your project has two parts:

1. **RAG API** (Python) – `api.py` + `chat.py` – FastAPI server with Chroma + OpenAI. This is what you currently expose via ngrok.
2. **WordPress plugin** – `chatbot.php` + `assets/` – Runs inside WordPress and calls the RAG API.

Below are practical ways to host both in the cloud.

---

## 1. Host the RAG API (Python)

The chatbot plugin calls the RAG backend at the URL set in `CMES_RAG_API_URL`. Deploy the API first, then point WordPress to that URL.

### Option A: Railway (recommended for quick deploy)

1. Sign up at [railway.app](https://railway.app).
2. Create a new project → **Deploy from GitHub** and connect this repo (or push the code to a repo Railway can access).
3. Add a **service** and set:
   - **Root directory**: project root (where `api.py` and `chat.py` live).
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `python api.py`
4. In the service → **Variables**, add:
   - `OPENAI_API_KEY` = your OpenAI API key (do **not** commit this; use Railway’s env vars).
5. Deploy. Railway will assign a URL like `https://your-app.up.railway.app`.
6. The API serves at `/chat`, so the full RAG URL is:  
   `https://your-app.up.railway.app/chat`  
   Use this as `CMES_RAG_API_URL` in WordPress (see section 3).

**Note:** Chroma data is rebuilt on each deploy from `docs.json` and `whitepaper.json` (no persistent disk needed for the current setup).

### Option B: Render

1. Sign up at [render.com](https://render.com).
2. **New → Web Service**, connect the repo.
3. Settings:
   - **Build**: `pip install -r requirements.txt`
   - **Start**: `python api.py`
   - **Instance type**: Free or paid.
4. **Environment** → add `OPENAI_API_KEY`.
5. Deploy and copy the service URL (e.g. `https://cmes-chatbot-xxxx.onrender.com`).  
   RAG URL = `https://cmes-chatbot-xxxx.onrender.com/chat`.

### Option C: Docker (any VPS or cloud that runs Docker)

From the project root:

```bash
docker build -t cmes-rag-api .
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key_here cmes-rag-api
```

Then put a reverse proxy (e.g. Nginx) or load balancer in front and use that public URL + `/chat` as `CMES_RAG_API_URL`.

---

## 2. Ensure the API is reachable

- The API must listen on `0.0.0.0` (already set in `api.py` via `HOST`/`PORT` env).
- Railway/Render set `PORT` automatically; locally you can use default port 8000.
- If WordPress is on HTTPS, the RAG URL should be **HTTPS** (Railway and Render provide this).

---

## 3. Point WordPress to the RAG API

Wherever WordPress is hosted (same server or managed WP):

1. In `wp-config.php` (before “That’s all, stop editing!”), add:

   ```php
   define( 'CMES_RAG_API_URL', 'https://your-rag-api-url/chat' );
   ```

   Replace `https://your-rag-api-url/chat` with the URL from step 1 (e.g. Railway or Render URL + `/chat`).

2. Install the plugin: copy the plugin folder (the one containing `chatbot.php` and `assets/`) into `wp-content/plugins/` and activate it.

The plugin will call `CMES_RAG_API_URL` for RAG answers; FAQ answers are still handled inside WordPress.

---

## 4. Hosting WordPress (if needed)

If you still need to host WordPress itself:

- **Managed WordPress**: e.g. WP Engine, Kinsta, Flywheel – upload the plugin via SFTP or their file manager and set `CMES_RAG_API_URL` in `wp-config.php` (if they allow custom constants) or via a small custom plugin that defines it.
- **VPS (DigitalOcean, Linode, AWS EC2, etc.)**: Install WordPress + PHP + MySQL, then copy the plugin and set `CMES_RAG_API_URL` in `wp-config.php`.

---

## 5. Security checklist

- **Never commit** `.env` or real API keys. Use environment variables on Railway/Render/VPS.
- Keep `OPENAI_API_KEY` only in the RAG API environment, not in the WordPress codebase.
- In production, consider restricting who can call your RAG API (e.g. firewall, API key, or same private network as WordPress).

---

## Quick reference

| Part           | What to deploy              | Where                          |
|----------------|-----------------------------|---------------------------------|
| RAG API        | `api.py`, `chat.py`, `requirements.txt`, `docs.json`, `whitepaper.json` | Railway / Render / Docker       |
| WordPress plugin| `chatbot.php` + `assets/`   | WordPress `wp-content/plugins/` |
| Config         | `CMES_RAG_API_URL` = RAG base URL + `/chat` | `wp-config.php`                 |
