from typing import Annotated, List, Literal, Dict
from uuid import UUID
from pydantic import BaseModel
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from typing import TypedDict


class InterviewState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    question_count: int
    done: bool


class PatientChatRequest(BaseModel):
    messages: str
    thread_id: UUID
    status: Literal["chatting", "done"] = "chatting"


class PatientStartRequest(BaseModel):
    patient_name: str


class InterviewReport(BaseModel):
    chat: List[Dict[str, str]]
    report_md: str | None = None
