from langchain_core.messages import AIMessage, HumanMessage
from chat.graph.state import InterviewReport


def structure_chat(chat: list) -> list[dict]:
    """Convert a LangChain message list into a simple role/content dict list."""
    structured = []
    for msg in chat:
        if isinstance(msg, AIMessage):
            structured.append({"AI Agent": msg.content})
        elif isinstance(msg, HumanMessage):
            structured.append({"Patient": msg.content})
    return structured
