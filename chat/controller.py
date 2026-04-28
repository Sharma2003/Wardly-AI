import json
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict

from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.checkpoint.redis import AsyncRedisSaver

from chat.graph.graph import build_app
from chat.graph.state import InterviewState, PatientChatRequest, InterviewReport, PatientStartRequest
from reports.reports import generate_report_from_chat
from reports.save_json import save_report_to_file
from helper.chatStore import structure_chat
from dotenv import load_dotenv
import os

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

log = logging.getLogger("wardly")

router = APIRouter(prefix="/session", tags=["interview"])

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

# in-memory sessions (MVP)
sessions: Dict[str, dict] = {}


def _config(thread_id: str):
    return {"configurable": {"thread_id": thread_id}}


async def _get_graph_app():
    async with AsyncRedisSaver.from_conn_string(REDIS_URL) as saver:
        await saver.asetup()
        return build_app(checkpointer=saver)


def _save_report(report: dict, thread_id: str):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = REPORTS_DIR / f"report_{ts}_{thread_id[:8]}.json"
    path.write_text(json.dumps(report, indent=2))
    log.info(f"Report saved → {path}")


def _get_session(thread_id: str):
    if thread_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[thread_id]


def _extract_ai_reply(messages):
    for m in reversed(messages):
        if isinstance(m, AIMessage):
            return m.content
    return ""



@router.post("/start")
async def start_session(req: PatientStartRequest):
    """
    Start a new interview session
    """
    thread_id = str(uuid.uuid4())

    graph_app = await _get_graph_app()

    result: InterviewState = await graph_app.ainvoke(
        {
            "messages": [HumanMessage(content="(start)")],
            "question_count": 0,
            "done": False,
        },
        config=_config(thread_id),
    )

    sessions[thread_id] = {
        "graph_state": result,
        "created_at": datetime.utcnow().isoformat(),
        "patient_name": req.patient_name,
    }

    return {
        "thread_id": thread_id,
        "assistant_reply": _extract_ai_reply(result["messages"]),
    }


@router.post("/chat")
async def next_message(req: PatientChatRequest):
    """
    Send patient message → get next AI response
    """
    thread_id = str(req.thread_id)
    session = _get_session(thread_id)

    gs: InterviewState = session["graph_state"]

    if gs.get("done"):
        raise HTTPException(409, "Interview already completed")

    graph_app = await _get_graph_app()

    next_state: InterviewState = {
        "messages": gs["messages"] + [HumanMessage(content=req.messages)],
        "question_count": gs.get("question_count", 0),
        "done": False,
    }

    result: InterviewState = await graph_app.ainvoke(
        next_state,
        config=_config(thread_id),
    )

    session["graph_state"] = result

    done = bool(result.get("done") or result.get("final_report"))


    if result.get("done"):
    

        chat = structure_chat(result["messages"])


        report = generate_report_from_chat(chat)


        save_report_to_file(report, thread_id, patient_name=session.get("patient_name", "patient"))


        result["final_report"] = report

    return {
        "assistant_reply": _extract_ai_reply(result["messages"]),
        "thread_id": thread_id,
        "status": "done" if done else "chatting",
    }


@router.get("/{thread_id}/report")
def get_report(thread_id: str):
    session = _get_session(thread_id)
    gs = session["graph_state"]

    report = gs.get("final_report")

    if report:
        return {
            "thread_id": thread_id,
            "report": report,
            "status": "ready",
        }

    if gs.get("done"):
        return {
            "thread_id": thread_id,
            "report": None,
            "status": "generating",
        }

    return {
        "thread_id": thread_id,
        "report": None,
        "status": "not_ready",
    }


@router.delete("/{thread_id}")
def end_session(thread_id: str):
    _get_session(thread_id)
    del sessions[thread_id]

    return {"message": "Session ended"}
