import io
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from api import sessions
from api.app import app


class ApiTurnTest(unittest.TestCase):
    def setUp(self) -> None:
        sessions.clear_all()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        sessions.clear_all()

    def test_health_does_not_expose_a_key(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertIn("key_configured", body)
        self.assertNotIn("GEMINI_API_KEY", body)
        self.assertNotIn("key", body)

    @patch("api.app.gemini_client.synthesize_speech", return_value=(b"RIFF", "audio/wav"))
    @patch("api.app.gemini_client.interviewer_reply", return_value="Tell me about yourself.")
    def test_turn_returns_text_and_audio_without_writing_files(
        self, _reply, _tts
    ) -> None:
        created = self.client.post("/api/sessions")
        self.assertEqual(created.status_code, 200)
        session_id = created.json()["session_id"]

        with patch(
            "api.app.gemini_client.transcribe_audio", return_value="I am a software engineer."
        ) as transcribe:
            turn = self.client.post(
                f"/api/sessions/{session_id}/turns",
                files={"audio": ("reply.wav", io.BytesIO(b"fake-wav"), "audio/wav")},
            )

        self.assertEqual(turn.status_code, 200)
        body = turn.json()
        self.assertEqual(body["transcript"], "I am a software engineer.")
        self.assertEqual(body["interviewer_text"], "Tell me about yourself.")
        self.assertEqual(body["audio_mime_type"], "audio/wav")
        self.assertTrue(body["audio_base64"])
        transcribe.assert_called_once()
        self.assertEqual(transcribe.call_args.args[0], b"fake-wav")

        stored = sessions.get_session(session_id)
        self.assertIsNotNone(stored)
        self.assertFalse(any("audio" in turn for turn in stored.history))
        wavs = list(Path(".").rglob("*.wav"))
        self.assertFalse(
            any("reply.wav" in str(path) or "fake-wav" in str(path) for path in wavs)
        )

    @patch("api.app.gemini_client.synthesize_speech", return_value=(b"RIFF", "audio/wav"))
    @patch("api.app.gemini_client.interviewer_reply", return_value="Opening question.")
    def test_end_calls_feedback_and_drops_the_session(self, reply, _tts) -> None:
        created = self.client.post("/api/sessions")
        session_id = created.json()["session_id"]

        def fake_feedback(transcript: str) -> dict[str, str]:
            self.assertIn("Opening question.", transcript)
            self.assertNotIn("You are a hiring interviewer", transcript)
            return {
                "pontos_positivos": "Amostra insuficiente.",
                "pontos_de_melhoria": "Amostra insuficiente.",
                "proximo_passo": "Gravar uma resposta falada em inglês.",
            }

        with patch("api.app.gemini_client.generate_feedback", side_effect=fake_feedback) as end:
            response = self.client.post(f"/api/sessions/{session_id}/end")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body), {"pontos_positivos", "pontos_de_melhoria", "proximo_passo"})
        self.assertIn("Amostra insuficiente", body["pontos_positivos"])
        end.assert_called_once()
        reply.assert_called_once()
        self.assertIsNone(sessions.get_session(session_id))


if __name__ == "__main__":
    unittest.main()
