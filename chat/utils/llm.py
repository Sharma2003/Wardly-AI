import os
import requests
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "alibayram/medgemma:27b")


def medgemma_get_text_response(messages: list[BaseMessage], max_new_tokens: int = 512) -> str:
    """
    Send a LangChain message list to Ollama's REST API and return the text response.
    Uses raw requests — avoids langchain-ollama version inconsistencies with num_predict.
    """
    ollama_msgs = []
    for m in messages:
        role = (
            "system" if m.type == "system"
            else "user" if m.type in ("human", "user")
            else "assistant"
        )
        ollama_msgs.append({"role": role, "content": m.content})

    payload = {
        "model": MODEL,
        "messages": ollama_msgs,
        "options": {"num_predict": max_new_tokens},
        "stream": False,
    }

    response = requests.post(
        f"{OLLAMA_URL}/api/chat",
        json=payload,
        timeout=180,
    )
    response.raise_for_status()
    return response.json()["message"]["content"].strip()
