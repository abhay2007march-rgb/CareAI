from pathlib import Path
from uuid import uuid4
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

from app.config import (
    GEMINI_API_KEY, GEMINI_MODEL, FRONTEND_ORIGIN, MAX_UPLOAD_MB, DATA_DIR
)
from app.schemas import ChatRequest, ChatResponse
from app.safety import SYSTEM_INSTRUCTIONS, DISCLAIMER, emergency_warning
from app.rag import index_pdf, retrieve

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Medical Chatbot API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

@app.get("/api/health")
def health():
    return {"status": "ok", "llm_configured": client is not None}

@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured.")
    warning = emergency_warning(payload.message)
    if warning:
        return ChatResponse(answer=warning, warning=warning, sources=[])

    try:
        retrieved = retrieve(payload.message)
        context = ""
        if retrieved:
            context = "\n\nRETRIEVED EDUCATIONAL DOCUMENT EXCERPTS:\n"
            for item in retrieved:
                context += (
                    f"\n[Document: {item['document']}, page: {item['page']}]\n"
                    f"{item['text']}\n"
                )

        conversation = []
        for item in payload.history[-10:]:
            conversation.append(f"{item.role.upper()}: {item.content}")
        conversation.append(f"USER: {payload.message}")
        prompt = (
            SYSTEM_INSTRUCTIONS
            + context
            + "\n\nConversation:\n"
            + "\n".join(conversation)
            + "\n\nRespond clearly and cautiously. If retrieved excerpts were used, "
              "identify them as uploaded-document context. Do not invent citations."
        )
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=800
            )
        )
        answer = (response.text or "").strip()
        if not answer:
            answer = "I couldn't generate a response. Please try again."
        if DISCLAIMER.lower() not in answer.lower():
            answer += "\n\n" + DISCLAIMER

        sources = [
            {
                "document": f"{item['document']} (page {item['page']})",
                "excerpt": item["text"][:220] + ("…" if len(item["text"]) > 220 else "")
            }
            for item in retrieved
        ]
        return ChatResponse(answer=answer, warning=None, sources=sources)
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(
            status_code=502,
            detail="The AI service could not complete the request. Check the API key, model name, quota, and server logs."
        ) from exc

@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    content = await file.read()
    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF exceeds {MAX_UPLOAD_MB} MB limit.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")
    safe_name = Path(file.filename).name
    stored_path = DATA_DIR / "uploads" / f"{uuid4().hex}.pdf"
    stored_path.parent.mkdir(parents=True, exist_ok=True)
    stored_path.write_bytes(content)
    try:
        count = index_pdf(stored_path, safe_name)
        return {"message": "PDF indexed successfully.", "filename": safe_name, "chunks_indexed": count}
    except ValueError as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("PDF indexing failed")
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not process this PDF.") from exc
