import json
import re
from langchain_core.messages import SystemMessage, HumanMessage
# from helper.chatStore import structure_chat
from helper.transcrips import structured_chat_to_text
from chat.config.prompts import DOCTOR_DEFAULT_REPORT_TEMPLATE, REPORT_WRITE_INSTRUCTION_FOR_DOCTOR
from chat.utils.llm import medgemma_get_text_response

def generate_report_from_chat(chat):
    
    transcript = structured_chat_to_text(chat)

    sys_msg = SystemMessage(
        content=REPORT_WRITE_INSTRUCTION_FOR_DOCTOR.format(
            ehr_summary="None provided."
        )
    )

    user_msg = HumanMessage(
        content=f"<interview>\n{transcript}\n</interview>"
    )

    raw = medgemma_get_text_response(
        [sys_msg, user_msg],
        max_new_tokens=1024
    )

    # Clean response
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    try:
        report = json.loads(cleaned)
    except json.JSONDecodeError:
        report = dict(DOCTOR_DEFAULT_REPORT_TEMPLATE)
        report["report_summary"] = cleaned
        report["status"] = "parse_error"

    return report