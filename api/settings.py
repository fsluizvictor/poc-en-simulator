from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMPTS_DIR = ROOT / "prompts"

ASR_MODEL = "gemini-3.5-transcribe"
DIALOGUE_MODEL = "gemini-3.5-flash-lite"
TTS_MODEL = "gemini-3.8-flash-lite-tts"
TTS_VOICE = "Kore"
ASR_LANGUAGE = "en-US"
ASR_MODE = "VERBATIM"

GEMINI_GENERATE_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

MAX_AUDIO_BYTES = 8 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 90
