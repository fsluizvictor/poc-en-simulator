#!/usr/bin/env python3
"""Teste curto da Sprint 1: a própria voz passa por reconhecimento, diálogo e síntese.

Uso, a partir da raiz do repositório, com a chave fora do Git:

    export GEMINI_API_KEY="..."
    .venv/bin/python scripts/sprint-1-voice-check.py

O áudio capturado é apagado ao final. O relatório em texto fica em
docs/sprint-1/resultado-teste-voz.md. Falhas entram nesse relatório.
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import wave
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMPTS = ROOT / "prompts"
REPORT = ROOT / "docs" / "sprint-1" / "resultado-teste-voz.md"
AUDIO_DIR = ROOT / "docs" / "sprint-1" / "audio"
CAPTURE_DEVICE = "plughw:1,0"
RECORD_SECONDS = 8

ASR_MODEL = "gemini-3.5-transcribe"
DIALOGUE_MODEL = "gemini-3.5-flash-lite"
TTS_MODEL = "gemini-3.8-flash-lite-tts"
TTS_VOICE = "Kore"


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def load_prompt(name: str) -> str:
    path = PROMPTS / name
    if not path.is_file():
        fail(f"Instrução ausente: {path}")
    return path.read_text(encoding="utf-8").strip()


def record(destination: Path) -> None:
    print(
        "Quando a gravação começar, responda em inglês, em uma ou duas frases, "
        "como numa entrevista: quem você é e com o que trabalha.",
        flush=True,
    )
    print(f"Gravando {RECORD_SECONDS} segundos em {CAPTURE_DEVICE}...", flush=True)
    completed = subprocess.run(
        [
            "arecord",
            "-D",
            CAPTURE_DEVICE,
            "-f",
            "S16_LE",
            "-r",
            "16000",
            "-c",
            "1",
            "-d",
            str(RECORD_SECONDS),
            "-q",
            str(destination),
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0 or not destination.is_file():
        detail = (completed.stderr or completed.stdout or "").strip()
        fail(f"A captura de áudio falhou.\n{detail}")
    with wave.open(str(destination), "rb") as handle:
        frames = handle.getnframes()
    if frames < 16000:
        fail("A gravação ficou curta demais. Fale durante os oito segundos e rode de novo.")
    print("Gravação encerrada. Enviando ao reconhecimento...")


def generate(model: str, body: dict) -> dict:
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": os.environ["GEMINI_API_KEY"],
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        fail(f"A chamada a {model} falhou ({exc.code}).\n{detail}")


def transcribe(audio_bytes: bytes) -> str:
    payload = generate(
        ASR_MODEL,
        {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "audio/wav",
                                "data": base64.b64encode(audio_bytes).decode(),
                            }
                        }
                    ],
                }
            ],
            "generationConfig": {
                "audioTranscriptionConfig": {
                    "languageCodes": ["en-US"],
                    "mode": "VERBATIM",
                }
            },
        },
    )
    return _text(payload)


def interviewer_reply(client, types, system_prompt: str, transcript: str) -> str:
    history = (
        "The interview has not started. Open it."
        if not transcript
        else f"Candidate said:\n{transcript}"
    )
    response = client.models.generate_content(
        model=DIALOGUE_MODEL,
        contents=history,
        config=types.GenerateContentConfig(system_instruction=system_prompt),
    )
    return (response.text or "").strip()


def _text(payload: dict) -> str:
    chunks = []
    for candidate in payload.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            if part.get("text"):
                chunks.append(part["text"])
    return "\n".join(chunks).strip()


def synthesize(line: str, destination: Path) -> None:
    # O SDK google-genai 3.1.0 envia speechConfig num formato que esta API rejeita.
    # A chamada REST abaixo foi a que devolveu audio/wav com esta chave.
    payload = generate(
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
    for candidate in payload.get("candidates") or []:
        for part in (candidate.get("content") or {}).get("parts") or []:
            inline = part.get("inlineData") or {}
            if inline.get("data"):
                encoded = inline["data"]
                break
    if not encoded:
        fail("A síntese não devolveu áudio.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(base64.b64decode(encoded))


def write_report(opening: str, transcript: str, reply: str, reply_audio: Path) -> None:
    months = {
        1: "janeiro",
        2: "fevereiro",
        3: "março",
        4: "abril",
        5: "maio",
        6: "junho",
        7: "julho",
        8: "agosto",
        9: "setembro",
        10: "outubro",
        11: "novembro",
        12: "dezembro",
    }
    today = date.today()
    written = f"{today.day} de {months[today.month]} de {today.year}"
    size = reply_audio.stat().st_size if reply_audio.is_file() else 0
    REPORT.write_text(
        "\n".join(
            [
                "# Resultado do teste curto de voz",
                "",
                f"**Data:** {written}  ",
                "**Quem falou:** a pessoa que executou este script, no microfone local.  ",
                f"**Duração capturada:** {RECORD_SECONDS} segundos.  ",
                "**Áudio da pessoa:** apagado ao fim do script. Não está no repositório.",
                "",
                "## O que foi exercitado",
                "",
                f"- Reconhecimento: `{ASR_MODEL}`, modo `VERBATIM`, idioma sugerido `en-US`.",
                f"- Diálogo: `{DIALOGUE_MODEL}`, com `prompts/entrevistador.txt`.",
                f"- Síntese: `{TTS_MODEL}`, voz `{TTS_VOICE}`.",
                "",
                "## Abertura da entrevistadora",
                "",
                opening or "[vazia]",
                "",
                "## Transcrição da resposta",
                "",
                transcript or "[vazia]",
                "",
                "## Fala seguinte da entrevistadora",
                "",
                reply or "[vazia]",
                "",
                "## Áudio sintetizado",
                "",
                f"Arquivo local, fora do Git: `{reply_audio.relative_to(ROOT)}` ({size} bytes).",
                "",
                "## O que não foi validado neste teste",
                "",
                "- Quatro turnos e a duração de cinco a dez minutos. Isso é a sessão-piloto da Sprint 3.",
                "- O retorno em três blocos. A instrução já está escrita; a chamada ocorre ao encerrar a sessão, na Sprint 2.",
                "- Acurácia do reconhecimento para além desta única frase.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    if not os.environ.get("GEMINI_API_KEY"):
        fail(
            "Defina GEMINI_API_KEY no ambiente. "
            "A chave não deve ser gravada no repositório."
        )
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        fail("Instale a dependência: .venv/bin/pip install -r requirements.txt")

    interviewer = load_prompt("entrevistador.txt")
    client = genai.Client()
    opening_audio = AUDIO_DIR / "abertura.wav"
    reply_audio = AUDIO_DIR / "resposta-entrevistadora.wav"
    capture_path: Path | None = None

    try:
        opening = interviewer_reply(client, types, interviewer, "")
        if not opening:
            fail("O modelo de diálogo não devolveu a abertura.")
        print("Abertura da entrevistadora:")
        print(opening)
        synthesize(opening, opening_audio)
        print("Reproduzindo a abertura. Responda quando a gravação começar.", flush=True)
        subprocess.run(["aplay", str(opening_audio)], check=False)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
            capture_path = Path(handle.name)
        record(capture_path)
        audio_bytes = capture_path.read_bytes()
        transcript = transcribe(audio_bytes)
        print("Transcrição:")
        print(transcript or "[vazia]")
        print()

        reply = interviewer_reply(client, types, interviewer, transcript)
        if not reply:
            fail("O modelo de diálogo não devolveu a fala seguinte.")
        print("Fala seguinte:")
        print(reply)
        synthesize(reply, reply_audio)
        write_report(opening, transcript, reply, reply_audio)
    finally:
        if capture_path is not None and capture_path.exists():
            capture_path.unlink()

    print(f"Relatório escrito em {REPORT}")
    if reply_audio.is_file():
        subprocess.run(["aplay", str(reply_audio)], check=False)


if __name__ == "__main__":
    main()
