from chat.graph.state import InterviewState
from chat.config.prompts import CLOSING_LINE
from langchain_core.messages import AIMessage


def should_continue(state: InterviewState) -> str:
    """Route: finalize when done flag is set or closing line was sent."""
    if state["done"]:
        return "finalize"
    # Belt-and-suspenders: also check if closing line is in last AI message
    messages = state.get("messages", [])
    if messages and isinstance(messages[-1], AIMessage):
        if CLOSING_LINE in messages[-1].content:
            return "finalize"
    return "wait_for_user"


def finalize_node(state: InterviewState) -> InterviewState:
    """No-op terminal node — report generation happens in update_report."""
    return state
