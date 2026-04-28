from langchain_core.messages import SystemMessage, HumanMessage
from typing import List, Any


def build_interview_transcript(messages: List[Any]) -> str:
    lines = []
    for m in messages:
        if isinstance(m, SystemMessage):
            continue
        role = "PATIENT" if isinstance(m, HumanMessage) else "ASSISTANT"
        lines.append(f"{role}: {m.content}")
    return "\n".join(lines)
