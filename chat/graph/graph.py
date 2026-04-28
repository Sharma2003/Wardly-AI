from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.sqlite import SqliteSaver

from chat.graph.state import InterviewState
from chat.graph.node import ask_question, update_report
from chat.graph.edges import finalize_node, should_continue


def build_app(checkpointer):
    g = StateGraph(InterviewState)

    g.add_node("ask_question", ask_question)
    g.add_node("finalize", finalize_node)
    g.add_node("update_report", update_report)

    g.add_edge(START, "ask_question")

    g.add_conditional_edges(
        "ask_question",
        should_continue,
        {
            "wait_for_user": END,   # pause; main loop feeds next user message
            "finalize": "finalize",
        },
    )

    g.add_edge("finalize", "update_report")
    g.add_edge("update_report", END)

    # MemorySaver keeps state in-process (no SQLite file needed for the demo)
    return g.compile(checkpointer=checkpointer)
