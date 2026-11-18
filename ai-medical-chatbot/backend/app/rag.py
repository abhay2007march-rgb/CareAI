from pathlib import Path
from functools import lru_cache
import chromadb
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from app.config import DATA_DIR

CHROMA_DIR = DATA_DIR / "chroma"
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@lru_cache(maxsize=1)
def get_embedder():
    # Downloads the embedding model on first use.
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@lru_cache(maxsize=1)
def get_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name="medical_education_documents",
        metadata={"hnsw:space": "cosine"}
    )

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
        start = max(end - overlap, start + 1)
    return chunks

def index_pdf(path: Path, display_name: str):
    reader = PdfReader(str(path))
    chunks, ids, metadatas = [], [], []
    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        for chunk_number, chunk in enumerate(split_text(page_text)):
            chunks.append(chunk)
            ids.append(f"{path.stem}-p{page_number}-c{chunk_number}")
            metadatas.append({
                "document": display_name,
                "page": page_number
            })
    if not chunks:
        raise ValueError("No selectable text found. Scanned PDFs are not supported.")
    embeddings = get_embedder().encode(chunks, normalize_embeddings=True).tolist()
    collection = get_collection()
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas
    )
    return len(chunks)

def retrieve(query: str, limit: int = 4):
    collection = get_collection()
    if collection.count() == 0:
        return []
    embedding = get_embedder().encode([query], normalize_embeddings=True).tolist()[0]
    result = collection.query(
        query_embeddings=[embedding],
        n_results=min(limit, collection.count()),
        include=["documents", "metadatas", "distances"]
    )
    found = []
    docs = result.get("documents") or [[]]
    metas = result.get("metadatas") or [[]]
    distances = result.get("distances") or [[]]
    for doc, meta, distance in zip(docs[0], metas[0], distances[0]):
        # Avoid passing very distant, likely irrelevant chunks to the LLM.
        if distance is not None and distance > 0.65:
            continue
        found.append({
            "text": doc,
            "document": meta.get("document", "Uploaded document"),
            "page": meta.get("page", "?")
        })
    return found
