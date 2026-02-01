from __future__ import annotations

import asyncio
import json
import uuid
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI(title="DiplomAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"]
)


def _make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=240)


class ItemRequest(BaseModel):
    type: str


async def _stream_items(topic: str) -> AsyncGenerator[bytes, None]:
    goals = [
        f"Определить теоретические основания исследования темы «{topic}».",
        f"Сформулировать методологию оценки и анализа по теме «{topic}».",
        f"Обосновать практическую значимость исследования по теме «{topic}»."
    ]
    tasks = [
        f"Собрать и систематизировать источники по теме «{topic}».",
        "Выявить ключевые подходы и определить критерии анализа.",
        "Сформировать набор показателей для оценки результатов.",
        "Проанализировать полученные данные и интерпретировать выводы.",
        "Сформулировать рекомендации по итогам исследования."
    ]

    for text in goals:
        payload = {"type": "goal", "id": _make_id("g"), "text": text}
        yield (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")
        await asyncio.sleep(0.4)

    for text in tasks:
        payload = {"type": "task", "id": _make_id("t"), "text": text}
        yield (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")
        await asyncio.sleep(0.35)


@app.post("/generate")
async def generate(request: GenerateRequest) -> StreamingResponse:
    return StreamingResponse(_stream_items(request.topic), media_type="application/json")


@app.post("/items/{item_id}/rephrase")
async def rephrase(item_id: str, request: ItemRequest) -> dict:
    return {
        "id": item_id,
        "text": f"Переформулированный вариант ({request.type}) для элемента {item_id}."
    }


@app.post("/items/{item_id}/replace")
async def replace(item_id: str, request: ItemRequest) -> dict:
    return {
        "id": item_id,
        "text": f"Новая альтернатива ({request.type}) для элемента {item_id}."
    }
