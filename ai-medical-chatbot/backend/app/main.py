
from pathlib import Path
from uuid import uuid4
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

from app.config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    FRONTEND_ORIGIN,
    MAX_UPLOAD_MB,
    DATA_DIR
)

from app.schemas import ChatRequest, ChatResponse
from app.safety import SYSTEM_INSTRUCTIONS, DISCLAIMER, emergency_warning
from app.rag import index_pdf, retrieve


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="AI Medical Chatbot API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"]
)


client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "llm_configured": client is not None,
        "provider": "Groq",
        "model": GROQ_MODEL
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):

    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured. Check your backend .env file."
        )

    warning = emergency_warning(payload.message)

    if warning:
        return ChatResponse(
            answer=warning,
            warning=warning,
            sources=[]
        )

    try:

        # Retrieve relevant uploaded PDF information
        retrieved = retrieve(payload.message)

        context = ""

        if retrieved:
            context = "\n\nRETRIEVED EDUCATIONAL DOCUMENT EXCERPTS:\n"

            for item in retrieved:
                context += (
                    f"\n[Document: {item['document']}, page: {item['page']}]\n"
                    f"{item['text']}\n"
                )

        # Prepare conversation history
        messages = [
            {
                "role": "system",
                "content": (
                    SYSTEM_INSTRUCTIONS
                    + context
                    + "\n\nRespond clearly and cautiously. "
                    "If retrieved excerpts were used, identify them "
                    "as uploaded-document context. Do not invent citations."
                )
            }
        ]

        for item in payload.history[-10:]:
            role = item.role.lower()

            if role in ("user", "assistant"):
                messages.append({
                    "role": role,
                    "content": item.content
                })

        messages.append({
            "role": "user",
            "content": payload.message
        })

        # Send request to Groq
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=800
        )

        answer = (
            response.choices[0].message.content or ""
        ).strip()

        if not answer:
            answer = "I couldn't generate a response. Please try again."

        if DISCLAIMER.lower() not in answer.lower():
            answer += "\n\n" + DISCLAIMER

        # Prepare PDF sources
        sources = [
            {
                "document": f"{item['document']} (page {item['page']})",
                "excerpt": (
                    item["text"][:220]
                    + ("…" if len(item["text"]) > 220 else "")
                )
            }
            for item in retrieved
        ]

        return ChatResponse(
            answer=answer,
            warning=None,
            sources=sources
        )

    except Exception as exc:

        logger.exception("Groq chat request failed")

        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {str(exc)}"
        ) from exc


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)):

    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    content = await file.read()

    if len(content) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"PDF exceeds {MAX_UPLOAD_MB} MB limit."
        )

    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid PDF."
        )

    safe_name = Path(file.filename).name

    stored_path = DATA_DIR / "uploads" / f"{uuid4().hex}.pdf"

    stored_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    stored_path.write_bytes(content)

    try:

        count = index_pdf(stored_path, safe_name)

        return {
            "message": "PDF indexed successfully.",
            "filename": safe_name,
            "chunks_indexed": count
        }

    except ValueError as exc:

        stored_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=422,
            detail=str(exc)
        ) from exc

    except Exception as exc:

        logger.exception("PDF indexing failed")

        stored_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail="Could not process this PDF."
        ) from exc
