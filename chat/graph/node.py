import re
import json

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

from chat.graph.state import InterviewState, InterviewReport
from chat.utils.llm import medgemma_get_text_response
from chat.config.prompts import (
    INTERVIEW_PROMPT,
    DOCTOR_DEFAULT_REPORT_TEMPLATE,
    CLOSING_LINE,
    MAX_QUESTIONS,
    REPORT_WRITE_INSTRUCTION_FOR_DOCTOR,
)
from chat.utils.transcripts import build_interview_transcript


def ask_question(state: InterviewState) -> InterviewState:
    """LLM asks exactly one interview question."""
    question_count = state.get("question_count", 0)

    system = SystemMessage(content=INTERVIEW_PROMPT)
    chat = [system] + state["messages"]
    llm_out = medgemma_get_text_response(chat, max_new_tokens=256)

    # Keep only the first question (first line ending in ?)
    q = llm_out.split("\n")[0].strip()
    if len(q.split()) > 20 and "?" in q:
        q = q[: q.index("?") + 1]

    new_messages = state["messages"] + [AIMessage(content=q)]
    question_count += 1

    done = question_count >= MAX_QUESTIONS
    if done:
        new_messages.append(AIMessage(content=CLOSING_LINE))

    return {
        **state,
        "messages": new_messages,
        "question_count": question_count,
        "done": done,
    }


def update_report(state: InterviewState) -> dict:
    """Generate the final structured JSON clinical brief from the transcript."""
    transcript = build_interview_transcript(state["messages"])

    sys_msg = SystemMessage(content=REPORT_WRITE_INSTRUCTION_FOR_DOCTOR.format(ehr_summary="None provided."))
    user_msg = HumanMessage(content=f"<interview>\n{transcript}\n</interview>")

    raw = medgemma_get_text_response([sys_msg, user_msg], max_new_tokens=1024)

    # Strip markdown fences if model wrapped output
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        report = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: return raw text in the summary field
        report = dict(DOCTOR_DEFAULT_REPORT_TEMPLATE)
        report["report_summary"] = cleaned
        report["status"] = "parse_error"

    return {**state, "final_report": report}
