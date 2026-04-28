# Wardly AI — Clinical Pre-Consultation Intake Agent

A voice/chat agent that conducts a structured clinical intake interview with a patient and generates a **structured clinical brief** (CC, HPI, ROS, Clinical Impression) ready for physician review.

Built for the Wardly Founding Engineer take-home exercise.

---

## Architecture

```
Patient Input
     │
     ▼
┌─────────────────────────────────────────────┐
│              LangGraph StateGraph            │
│                                             │
│   START → ask_question ──(done?)──► finalize │
│                │                       │    │
│              END                  update_report
│           (wait for              (JSON clinical │
│           next turn)              brief output) │
└─────────────────────────────────────────────┘
     │
     ▼
Structured JSON Report saved to /reports/
```

**Two nodes:**
- `ask_question` — MedGemma 27B follows an OLDCARTS-based interview prompt, asking one question at a time (max 15 questions)
- `update_report` — MedGemma 27B synthesises the full transcript into a structured JSON clinical brief (CC, HPI, ROS, Clinical Impression, Information Gaps)

**Routing:** `should_continue` edge checks `done` flag → routes to `finalize → update_report` or pauses for next patient turn.

**Checkpointing:** `MemorySaver` keeps conversation state across turns within a session.

---

## Setup

### Prerequisites
- Python 3.10+
- [Ollama](https://ollama.com/) running locally (or via ngrok for team sharing)
- MedGemma 27B pulled: `ollama pull alibayram/medgemma:27b`

### Install

```bash
git clone <your-repo>
cd Wardly-AI

# Using uv (recommended)
uv sync

# Or pip
pip install -r requirements.txt
```

### Configure

Edit `.env`:
```env
OLLAMA_URL=http://localhost:11434       # or your ngrok URL
OLLAMA_MODEL=alibayram/medgemma:27b
```

### Run

```bash
python main.py
```

---

## What It Does

1. Opens with a warm clinical greeting and asks for the patient's chief complaint
2. Follows the **OLDCARTS framework** conversationally (Onset, Location, Duration, Character, Aggravating/relieving, Radiation, Timing, Severity)
3. Probes high-yield clues with 1-2 follow-up questions before moving on
4. After 15 questions (or when patient can't provide more info), closes the interview
5. Generates a **structured JSON clinical brief** with:
   - Chief Complaint
   - History of Present Illness (full OLDCARTS)
   - Review of Systems (positive findings only)
   - Clinical Impression (differential considerations, not a diagnosis)
   - Information Gaps (what the physician should probe further)
6. Saves the report as `reports/report_<timestamp>.json`


## Design Decisions

- **MedGemma 27B** as the sole model — medically fine-tuned, runs locally (privacy-safe for PHI)
- **LangGraph** for state management — clean separation of interview logic vs report generation, resumable sessions
- **OLDCARTS prompt structure** — mirrors how clinicians actually take history; produces HPI a physician can use directly
- **Two-phase pipeline** — interviewer and report writer are separate prompts/calls, so each can be independently optimised
- **JSON output schema** — designed to be database-insertable without post-processing

---

## Project Structure

```
Wardly-AI/
├── main.py                    # CLI entry point
├── chat/
│   ├── config/
│   │   └── prompts.py         # Interview + report generation prompts
│   ├── graph/
│   │   ├── graph.py           # LangGraph StateGraph definition
│   │   ├── node.py            # ask_question + update_report nodes
│   │   ├── edges.py           # Routing logic
│   │   └── state.py           # InterviewState TypedDict
│   └── utils/
│       ├── llm.py             # Ollama API wrapper
│       └── transcripts.py     # Message → transcript formatter
├── helper/
│   └── chatStore.py  
├── report/         # Chat structuring utility
├── reports/
    └── reports.py
    └── save_json.py                  # Generated JSON reports saved here
├── .env                       # OLLAMA_URL, OLLAMA_MODEL
└── requirements.txt
```
