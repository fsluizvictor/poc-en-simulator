"""API local no padrão Backend for Frontend. Um turno = uma requisição síncrona."""

from __future__ import annotations

import base64
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import gemini_client, sessions
from api.settings import MAX_AUDIO_BYTES

app = FastAPI(title="poc-en-simulator", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(gemini_client.GeminiError)
def _gemini_error(_request, exc: gemini_client.GeminiError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


def _audio_payload(text: str, audio_bytes: bytes, mime: str) -> dict[str, str]:
    return {
        "interviewer_text": text,
        "audio_base64": base64.b64encode(audio_bytes).decode(),
        "audio_mime_type": mime,
    }


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {
        "ok": True,
        "key_configured": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
    }


@app.post("/api/sessions")
def create_session() -> dict:
    text = gemini_client.interviewer_reply([])
    audio_bytes, mime = gemini_client.synthesize_speech(text)
    session = sessions.create_session()
    session.history.append({"role": "interviewer", "text": text})
    return {"session_id": session.id, **_audio_payload(text, audio_bytes, mime)}


@app.post("/api/sessions/{session_id}/turns")
async def take_turn(session_id: str, audio: UploadFile = File(...)) -> dict:
    session = sessions.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    mime_type = (audio.content_type or "application/octet-stream").split(";")[0]
    audio_bytes = await audio.read()
    await audio.close()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="O turno exige áudio capturado.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        audio_bytes = b""
        raise HTTPException(status_code=413, detail="O áudio enviado excede o limite.")

    transcript = gemini_client.transcribe_audio(audio_bytes, mime_type)
    audio_bytes = b""

    pending = list(session.history)
    pending.append({"role": "candidate", "text": transcript})
    reply = gemini_client.interviewer_reply(pending)
    reply_audio, reply_mime = gemini_client.synthesize_speech(reply)
    session.history = pending
    session.history.append({"role": "interviewer", "text": reply})

    return {
        "transcript": transcript,
        **_audio_payload(reply, reply_audio, reply_mime),
    }


@app.post("/api/sessions/{session_id}/end")
def end_session(session_id: str) -> dict:
    session = sessions.drop_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    transcript = sessions.transcript_for_feedback(session)
    blocks = gemini_client.generate_feedback(transcript)
    session.history.clear()
    return blocks
