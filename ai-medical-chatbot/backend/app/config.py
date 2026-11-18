
import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-20b"
).strip()

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173"
).strip()

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))

DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
