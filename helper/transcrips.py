def structured_chat_to_text(chat):
    lines = []
    for turn in chat:
        if "Patient" in turn:
            lines.append(f"Patient: {turn['Patient']}")
        elif "AI Agent" in turn:
            lines.append(f"Assistant: {turn['AI Agent']}")
    return "\n".join(lines)