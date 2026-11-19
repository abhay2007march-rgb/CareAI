
from pathlib import Path
from pypdf import PdfReader
from app.config import DATA_DIR

UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Lightweight in-memory document index
DOCUMENT_CHUNKS = []


def split_text(text: str, chunk_size: int = 900, overlap: int = 150):
    text = " ".join(text.split())

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])

        if end == len(text):
            break

        start = end - overlap

    return chunks


def index_pdf(path: Path, display_name: str):
    reader = PdfReader(str(path))
    new_chunks = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""

        for chunk in split_text(page_text):
            new_chunks.append({
                "text": chunk,
                "document": display_name,
                "page": page_number
            })

    if not new_chunks:
        raise ValueError(
            "No selectable text found. Scanned PDFs are not supported."
        )

    DOCUMENT_CHUNKS.extend(new_chunks)

    return len(new_chunks)


def retrieve(query: str, limit: int = 4):
    if not DOCUMENT_CHUNKS:
        return []

    query_words = set(query.lower().split())
    scored_chunks = []

    for item in DOCUMENT_CHUNKS:
        chunk_words = set(item["text"].lower().split())
        score = len(query_words.intersection(chunk_words))

        if score > 0:
            scored_chunks.append((score, item))

    scored_chunks.sort(key=lambda item: item[0], reverse=True)

    return [
        item for score, item in scored_chunks[:limit]
    ]
