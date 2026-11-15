#!/usr/bin/env python3
"""Primeiro turno real da Sprint 2: uma frase falada de propósito no microfone.

Não repete a captura para obter um texto apresentável. Se a transcrição vier
vazia, em outra língua, ou se alguma chamada falhar, o relatório conserva o
ocorrido. O áudio da pessoa é apagado. Nada de transcrição fica gravado pela API.
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
REPORT = ROOT / "docs" / "sprint-2" / "resultado-primeiro-turno.md"
CAPTURE_DEVICE = "default"
RECORD_SECONDS = 10
API = "http://127.0.0.1:8765"
PHRASE = "I am a software engineer and I work with Python and web APIs."


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def months_today() -> str:
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
    return f"{today.day} de {months[today.month]} de {today.year}"


def post_json(path: str, body: dict | None = None) -> dict:
    request = urllib.request.Request(
        f"{API}{path}",
        data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def post_audio(path: str, audio_bytes: bytes) -> dict:
    boundary = "----sprint2turn"
    parts = [
        f"--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="audio"; filename="turn.wav"\r\n',
        b"Content-Type: audio/wav\r\n\r\n",
        audio_bytes,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    request = urllib.request.Request(
        f"{API}{path}",
        data=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def record(destination: Path) -> str:
    print(
        "Fale agora, em inglês, esta frase no microfone:\n"
        f"    {PHRASE}\n"
        f"A gravação dura {RECORD_SECONDS} segundos e não será repetida.",
        flush=True,
    )
    spoken = ["spd-say", "-w", "-l", "en", f"Please say: {PHRASE}"]
    subprocess.run(spoken, check=False)
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
        return f"A captura de áudio falhou. {detail}".strip()
    with wave.open(str(destination), "rb") as handle:
        frames = handle.getnframes()
    if frames < 16000:
        return "A gravação ficou curta demais."
    return ""


def write_report(rows: dict[str, str]) -> None:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Resultado do primeiro turno real",
        "",
        f"**Data:** {months_today()}  ",
        "**Cenário:** Entrevista de emprego — Tecnologia  ",
        f"**Frase pedida:** {PHRASE}  ",
        "**Áudio da pessoa:** apagado ao fim do script. Não está no repositório.",
        "",
        "## Pedido feito no microfone",
        "",
        "Pediu-se, em voz alta e neste relatório, uma frase dita de propósito em inglês.",
        "A captura não foi repetida para obter um texto apresentável.",
        "",
        "## Abertura da entrevistadora",
        "",
        rows.get("opening") or "[não obtida]",
        "",
        "## Transcrição do primeiro turno",
        "",
        rows.get("transcript") or "[vazia]",
        "",
        "## Fala seguinte da entrevistadora",
        "",
        rows.get("reply") or "[não obtida]",
        "",
        "## Retorno em três blocos",
        "",
        "### Pontos positivos",
        "",
        rows.get("pontos_positivos") or "[não obtido]",
        "",
        "### Pontos de melhoria",
        "",
        rows.get("pontos_de_melhoria") or "[não obtido]",
        "",
        "### Próximo passo",
        "",
        rows.get("proximo_passo") or "[não obtido]",
        "",
        "## Falhas observadas",
        "",
        rows.get("failure") or "Nenhuma chamada falhou.",
        "",
        "## O que este registro não afirma",
        "",
        "- Não afirma reconhecimento de sotaque brasileiro se a transcrição veio vazia ou em outra língua.",
        "- Não cobre a sessão-piloto de cinco a dez minutos. Isso é a Sprint 3.",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    if not os.environ.get("GEMINI_API_KEY"):
        fail("A API local precisa de GEMINI_API_KEY no ambiente do processo.")

    rows = {
        "opening": "",
        "transcript": "",
        "reply": "",
        "pontos_positivos": "",
        "pontos_de_melhoria": "",
        "proximo_passo": "",
        "failure": "",
    }
    capture_path: Path | None = None
    try:
        try:
            created = post_json("/api/sessions")
        except urllib.error.HTTPError as exc:
            rows["failure"] = (
                f"A abertura falhou ({exc.code}). "
                f"{exc.read().decode('utf-8', 'replace')}"
            )
            write_report(rows)
            fail(rows["failure"])
        except urllib.error.URLError as exc:
            rows["failure"] = f"A API local não respondeu. {exc.reason}"
            write_report(rows)
            fail(rows["failure"])

        rows["opening"] = created.get("interviewer_text") or ""
        print("Abertura:", rows["opening"] or "[vazia]", flush=True)
        session_id = created["session_id"]
        encoded = created.get("audio_base64") or ""
        if encoded:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
                Path(handle.name).write_bytes(base64.b64decode(encoded))
                opening_audio = Path(handle.name)
            subprocess.run(["aplay", "-q", str(opening_audio)], check=False)
            opening_audio.unlink(missing_ok=True)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as handle:
            capture_path = Path(handle.name)
        capture_error = record(capture_path)
        if capture_error:
            rows["failure"] = capture_error
            write_report(rows)
            fail(capture_error)

        audio_bytes = capture_path.read_bytes()
        try:
            turn = post_audio(f"/api/sessions/{session_id}/turns", audio_bytes)
        except urllib.error.HTTPError as exc:
            rows["failure"] = (
                f"O turno falhou ({exc.code}). "
                f"{exc.read().decode('utf-8', 'replace')}"
            )
            write_report(rows)
            fail(rows["failure"])
        finally:
            audio_bytes = b""

        rows["transcript"] = turn.get("transcript") or ""
        rows["reply"] = turn.get("interviewer_text") or ""
        print("Transcrição:", rows["transcript"] or "[vazia]", flush=True)
        print("Fala seguinte:", rows["reply"] or "[vazia]", flush=True)

        try:
            feedback = post_json(f"/api/sessions/{session_id}/end")
        except urllib.error.HTTPError as exc:
            rows["failure"] = (
                f"O encerramento falhou ({exc.code}). "
                f"{exc.read().decode('utf-8', 'replace')}"
            )
            write_report(rows)
            fail(rows["failure"])

        rows["pontos_positivos"] = feedback.get("pontos_positivos") or ""
        rows["pontos_de_melhoria"] = feedback.get("pontos_de_melhoria") or ""
        rows["proximo_passo"] = feedback.get("proximo_passo") or ""
        write_report(rows)
    finally:
        if capture_path is not None and capture_path.exists():
            capture_path.unlink()

    print(f"Relatório escrito em {REPORT}")


if __name__ == "__main__":
    main()
