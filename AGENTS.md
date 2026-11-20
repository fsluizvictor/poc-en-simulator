# AGENTS.md

Local proof of concept: one English voice job interview. React at `http://127.0.0.1:5173`, FastAPI BFF at `http://127.0.0.1:8765`. One HTTP request per turn. This is not the academic report repository.

## Read, then stop

Open the row that matches the task. Do not search sibling repositories, GitHub, or the rest of `docs/` unless the user names that file.

| Task | Open only |
|------|-----------|
| Turn, models, session | `api/app.py`, `api/gemini_client.py`, `api/settings.py`, `api/sessions.py` |
| Interviewer or feedback behavior | `prompts/entrevistador.txt` or `prompts/feedback.txt` |
| Screen | `web/src/App.jsx` |
| In or out of scope | `docs/sprint-1/requisitos-do-fluxo.md` (section 4) |
| Why this stack | `docs/sprint-1/combinacao-tecnologica.md` (sections 1–2) |

## Fixed choices

Leave these in place unless the user asks to change them. Constants live in `api/settings.py`.

- ASR: `gemini-3.5-transcribe`, mode `VERBATIM`, language `en-US`. No system prompt on ASR.
- Dialogue and feedback: `gemini-3.5-flash-lite`.
- TTS: `gemini-3.8-flash-lite-tts`, voice `Kore`.
- One provider, Gemini free tier. Dialogue reads `prompts/entrevistador.txt`. Feedback reads `prompts/feedback.txt` and runs only on session end.
- History stays in the process dict in `api/sessions.py`. Clear audio bytes after transcription. Drop the session on end.
- `GEMINI_API_KEY` stays in the process environment. It does not enter the repo, the browser, or a committed file.

## Out of scope

Fluency score, correction during the conversation, accounts, database, websocket or Live API, extra scenarios, cloud deploy as a completion condition, a commercial product, a formal usability study.

## Evidence

Record the transcript, timing, citation, and test result that actually occurred. An empty transcription stays empty in the report. A microphone session needs the user: stop and wait. Do not claim a fluency gain.

## Commands

```bash
scripts/run-local.sh
.venv/bin/python -m unittest discover -s tests
```

Tests mock Gemini. Do not call the live API from `tests/`.

## State on 2026-11-20

Sprints 1 and 2 are in this repo. Sprint 3 (pilot log, privacy note, DAS v1) has not started. Both recorded voice tests returned an empty transcript. Start a Sprint 3 deliverable only when the user asks for that deliverable.

New notes go in `docs/sprint-N/`, in Brazilian Portuguese, with the header shape of `docs/sprint-1/requisitos-do-fluxo.md`. Leave a closed sprint record as it is, including a failed recognition.
