"""
Wardly AI — FastAPI Entry Point
================================
Run:
    uvicorn main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chat.graph.graph import build_app
import chat.controller as controller
from dotenv import load_dotenv
import os
REDIS_URL = os.getenv("REDIS_URL")
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("wardly")


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     log.info("Building LangGraph app…")
#     controller.langgraph_app = build_app(checkpointer=REDIS_URL)
#     log.info("LangGraph app ready.")
#     yield
#     log.info("Shutting down.")


app = FastAPI(
    title="Wardly AI",
    description="Clinical pre-consultation intake agent — structured interview → clinical brief.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "sessions_active": len(controller.sessions)}


app.include_router(controller.router)
