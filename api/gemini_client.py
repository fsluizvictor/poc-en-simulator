"""Chamadas ao provedor. Reconhecimento e síntese usam REST; diálogo usa o SDK."""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request

from google import genai
from google.genai import types

from api.feedback import parse_feedback
from api.settings import (
    ASR_LANGUAGE,
    ASR_MODE,
    ASR_MODEL,
    DIALOGUE_MODEL,
    GEMINI_GENERATE_URL,
    PROMPTS_DIR,
    REQUEST_TIMEOUT_SECONDS,
    TTS_MODEL,
    TTS_VOICE,
)


class GeminiError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def require_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise GeminiError(
            "GEMINI_API_KEY não está definida no ambiente do processo da API.",
            status_code=503,
        )
    return key


def load_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    if not path.is_file():
        raise GeminiError(f"Instrução ausente: {path}", status_code=500)
    return path.read_text(encoding="utf-8").strip()


def _extract_text(payload: dict) -> str:
    chunks: list[str] = []
    for candidate in payload.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if part.get("text"):
                chunks.append(part["text"])
    return "\n".join(chunks).strip()


def _generate_rest(model: str, body: dict) -> dict:
    key = require_api_key()
    request = urllib.request.Request(
        GEMINI_GENERATE_URL.format(model=model),
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise GeminiError(
            f"A chamada a {model} falhou ({exc.code}). {detail}",
            status_code=502,
        ) from exc
    except urllib.error.URLError as exc:
        raise GeminiError(
            f"A chamada a {model} não alcançou o provedor. {exc.reason}",
            status_code=502,
        ) from exc


def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """O modelo de transcrição não recebe instrução de sistema. Modo VERBATIM."""
    payload = _generate_rest(
        ASR_MODEL,
        {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type or "audio/wav",
                                "data": base64.b64encode(audio_bytes).decode(),
                            }
                        }
                    ],
                }
            ],
            "generationConfig": {
                "audioTranscriptionConfig": {
                    "languageCodes": [ASR_LANGUAGE],
                    "mode": ASR_MODE,
                }
            },
        },
    )
    return _extract_text(payload)


def _dialogue_contents(history: list[dict[str, str]]) -> list[types.Content]:
    contents = [
        types.Content(
            role="user",
            parts=[types.Part(text="The interview has not started. Open it.")],
        )
    ]
    for turn in history:
        if turn["role"] == "interviewer":
            contents.append(
                types.Content(
                    role="model",
                    parts=[types.Part(text=turn["text"])],
                )
            )
        else:
            spoken = turn["text"] if turn["text"] else ""
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=f"Candidate said:\n{spoken}")],
                )
            )
    return contents


def interviewer_reply(history: list[dict[str, str]]) -> str:
    require_api_key()
    client = genai.Client()
    response = client.models.generate_content(
        model=DIALOGUE_MODEL,
        contents=_dialogue_contents(history),
        config=types.GenerateContentConfig(
            system_instruction=load_prompt("entrevistador.txt")
        ),
    )
    text = (response.text or "").strip()
    if not text:
        raise GeminiError("O modelo de diálogo não devolveu a fala da entrevistadora.")
    return text


def synthesize_speech(line: str) -> tuple[bytes, str]:
    """REST generateContent. O SDK google-genai 3.1.0 recusou speechConfig."""
    payload = _generate_rest(
        TTS_MODEL,
        {
            "contents": [{"role": "user", "parts": [{"text": line}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"voice": TTS_VOICE}},
            },
        },
    )
    encoded = ""
    mime = "audio/wav"
    for candidate in payload.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or {}
            if inline.get("data"):
                encoded = inline["data"]
                mime = inline.get("mimeType") or mime
                break
        if encoded:
            break
    if not encoded:
        raise GeminiError("A síntese não devolveu áudio.")
    return base64.b64decode(encoded), mime


def generate_feedback(transcript: str) -> dict[str, str]:
    """Segunda chamada, só no encerramento. Não usa a instrução da entrevistadora."""
    require_api_key()
    client = genai.Client()
    response = client.models.generate_content(
        model=DIALOGUE_MODEL,
        contents=(
            "Interview transcript:\n\n"
            f"{transcript if transcript.strip() else '[empty transcript]'}"
        ),
        config=types.GenerateContentConfig(
            system_instruction=load_prompt("feedback.txt")
        ),
    )
    raw = (response.text or "").strip()
    if not raw:
        raise GeminiError("O modelo de retorno não devolveu os três blocos.")
    return parse_feedback(raw)
