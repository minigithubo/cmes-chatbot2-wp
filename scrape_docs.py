#!/usr/bin/env python3
"""
Efficient scraper for CMES (or any) site → docs.json format.
- Fetches only configured URLs (no blind crawl).
- Extracts main content, chunks by section (h1–h6) for better RAG retrieval.
- Outputs the same structure as docs.json so you can replace or merge.

Usage:
  pip install requests beautifulsoup4
  # Edit scrape_config.json: set base_url and urls (paths or full URLs).
  python scrape_docs.py                    # → scraped_docs.json
  python scrape_docs.py --merge docs.json  # merge into docs.json (by id)
"""

import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
CONFIG_PATH = Path(__file__).parent / "scrape_config.json"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CMES-DocScraper/1.0)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def load_config(path=CONFIG_PATH):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch(url, timeout=15):
    r = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.text


def extract_text(soup):
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "iframe"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def find_main_content(soup, selectors):
    for sel in selectors:
        if "," in sel:
            for s in sel.split(","):
                el = soup.select_one(s.strip())
                if el:
                    return el
        else:
            el = soup.select_one(sel)
            if el:
                return el
    return soup.find("body") or soup


def chunk_by_headings(soup, max_chars):
    selectors = ["h1", "h2", "h3", "h4", "h5", "h6"]
    chunks = []
    current_heading = "Overview"
    current_text = []
    current_len = 0

    def flush():
        nonlocal current_text, current_heading
        if current_text:
            text = "\n".join(current_text).strip()
            if text:
                chunks.append({"heading": current_heading, "text": text})
        current_text = []
        current_heading = "Overview"

    for el in main.find_all(True):
        if el.name in selectors:
            flush()
            current_heading = el.get_text(separator=" ", strip=True) or "Section"
            current_len = 0
            continue
        if el.name in ("p", "li", "td", "th") or (
            el.name in ("div", "span") and el.get_text(strip=True)
        ):
            block = el.get_text(separator=" ", strip=True)
            if not block:
                continue
            if current_len + len(block) > max_chars and current_text:
                flush()
                current_heading = "Continued"
            current_text.append(block)
            current_len += len(block)

    flush()
    return chunks


def chunk_fallback(soup, max_chars):
    text = extract_text(soup)
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            break_at = text.rfind("\n", start, end)
            if break_at > start:
                end = break_at + 1
        chunks.append({"heading": "Content", "text": text[start:end].strip()})
        start = end
    return chunks


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_") or "section"


def scrape_url(full_url, config):
    html = fetch(full_url)
    soup = BeautifulSoup(html, "html.parser")
    selectors = config.get("content_selector", "main, article, .content")
    if isinstance(selectors, str):
        selectors = [s.strip() for s in selectors.split(",")]
    main = find_main_content(soup, selectors)
    if not main:
        return []
    max_chars = config.get("max_chunk_chars", 1200)
    if config.get("chunk_by_heading", True):
        chunks = chunk_by_headings(main, max_chars)
    else:
        chunks = chunk_fallback(main, max_chars)
    base = urlparse(full_url)
    page_name = base.path.strip("/") or "home"
    page_name = page_name.replace("/", "_")
    prefix = config.get("id_prefix", "scraped")
    docs = []
    for i, c in enumerate(chunks):
        if not c["text"]:
            continue
        doc_id = f"{prefix}_{page_name}_{slug(c['heading'])[:30]}_{i}"
        docs.append({
            "id": doc_id,
            "text": f"Page: {page_name}\nSection: {c['heading']}\n{c['text']}",
            "meta": {"page": page_name, "section": c["heading"], "source": full_url},
        })
    return docs


def main():
    config = load_config()
    base_url = config["base_url"].rstrip("/")
    urls = config["urls"]
    all_docs = []
    seen_ids = set()

    for u in urls:
        full = urljoin(base_url + "/", u)
        try:
            docs = scrape_url(full, config)
            for d in docs:
                if d["id"] not in seen_ids:
                    seen_ids.add(d["id"])
                    all_docs.append(d)
            print(f"OK {full} -> {len(docs)} chunks", file=sys.stderr)
        except Exception as e:
            print(f"SKIP {full}: {e}", file=sys.stderr)

    out = {"documents": all_docs}
    out_path = Path(__file__).parent / "scraped_docs.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(all_docs)} documents to {out_path}", file=sys.stderr)

    if "--merge" in sys.argv:
        merge_idx = sys.argv.index("--merge")
        target_file = Path(sys.argv[merge_idx + 1]) if merge_idx + 1 < len(sys.argv) else Path("docs.json")
        if target_file.exists():
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            existing = {d["id"]: d for d in data.get("documents", [])}
            for d in all_docs:
                existing[d["id"]] = d
            data["documents"] = list(existing.values())
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Merged into {target_file} ({len(data['documents'])} total)", file=sys.stderr)
        else:
            print(f"Merge target not found: {target_file}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
