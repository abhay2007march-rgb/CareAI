from pydantic import BaseModel, Field
from typing import Literal

class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=12)

class Source(BaseModel):
    document: str
    excerpt: str

class ChatResponse(BaseModel):
    answer: str
    warning: str | None = None
    sources: list[Source] = Field(default_factory=list)
