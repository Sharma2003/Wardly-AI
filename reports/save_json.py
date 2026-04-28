import os
import json
import re

def save_report_to_file(report, thread_id, patient_name="patient"):
    os.makedirs("report", exist_ok=True)
    
    # Sanitize patient name for filename
    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', patient_name).lower()
    
    # Find the next index for this patient
    index = 1
    while os.path.exists(f"report/{safe_name}-{index}.json"):
        index += 1
    
    path = f"report/{safe_name}-{index}.json"

    with open(path, "w") as f:
        json.dump(report, f, indent=2)

    return path