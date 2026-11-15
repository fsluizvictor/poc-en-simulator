import { useEffect, useRef, useState } from "react";

const SCENARIO = "Entrevista de emprego — Tecnologia";

function pickRecorderMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return types.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
}

function decodeAudio(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || "audio/wav" }));
}

async function readError(response) {
  try {
    const body = await response.json();
    return body.detail || response.statusText;
  } catch {
    return response.statusText;
  }
}

export default function App() {
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState("A sessão ainda não começou.");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [interviewerText, setInterviewerText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [turnTaken, setTurnTaken] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  function replaceAudio(nextUrl) {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
  }

  async function playInterviewer(payload) {
    const nextUrl = decodeAudio(payload.audio_base64, payload.audio_mime_type);
    replaceAudio(nextUrl);
    const player = new Audio(nextUrl);
    try {
      await player.play();
    } catch {
      setStatus("A voz da entrevistadora está pronta. Use o controle de áudio se a reprodução automática for bloqueada.");
    }
  }

  async function startSession() {
    setError("");
    setFeedback(null);
    setTranscript("");
    setTurnTaken(false);
    setPhase("starting");
    setStatus("Abrindo a entrevista…");
    try {
      const response = await fetch("/api/sessions", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const payload = await response.json();
      setSessionId(payload.session_id);
      setInterviewerText(payload.interviewer_text);
      setPhase("ready");
      setStatus("Responda em inglês pelo microfone.");
      await playInterviewer(payload);
    } catch (err) {
      setPhase("idle");
      setError(err.message);
    }
  }

  async function beginRecording() {
    setError("");
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        await sendTurn(blob);
      };
      recorder.start();
      setPhase("recording");
      setStatus("Gravando. Fale em inglês e depois envie o turno.");
    } catch (err) {
      setError(err.message);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      setPhase("turning");
      setStatus("Processando o turno…");
      recorder.stop();
    }
  }

  async function sendTurn(blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, "turn.webm");
      const response = await fetch(`/api/sessions/${sessionId}/turns`, {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const payload = await response.json();
      setTranscript(payload.transcript || "");
      setTurnTaken(true);
      setInterviewerText(payload.interviewer_text);
      setPhase("ready");
      setStatus(
        payload.transcript
          ? "Turno concluído. Pode gravar a próxima resposta ou encerrar."
          : "A transcrição deste turno veio vazia. A entrevistadora segue sem texto inventado."
      );
      await playInterviewer(payload);
    } catch (err) {
      setPhase("ready");
      setError(err.message);
    }
  }

  async function endSession() {
    setError("");
    setPhase("ending");
    setStatus("Gerando o retorno em três blocos…");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setFeedback(await response.json());
      setPhase("ended");
      setStatus("Sessão encerrada. O retorno abaixo não entra no meio da conversa.");
      setSessionId("");
    } catch (err) {
      setPhase("ready");
      setError(err.message);
    }
  }

  const busy = ["starting", "turning", "ending"].includes(phase);

  return (
    <main className="page">
      <h1>Simulador de conversação em inglês</h1>
      <p className="scenario">{SCENARIO}</p>
      <p className={error ? "status error" : "status"}>{error || status}</p>

      <div className="actions">
        <button type="button" onClick={startSession} disabled={phase !== "idle" && phase !== "ended"}>
          Iniciar entrevista
        </button>
        <button type="button" onClick={beginRecording} disabled={phase !== "ready" || busy}>
          Gravar resposta
        </button>
        <button
          type="button"
          className="secondary"
          onClick={stopRecording}
          disabled={phase !== "recording"}
        >
          Parar e enviar
        </button>
        <button
          type="button"
          className="secondary"
          onClick={endSession}
          disabled={!sessionId || phase === "recording" || busy}
        >
          Encerrar sessão
        </button>
      </div>

      {phase === "recording" ? <p className="recording">Gravando…</p> : null}

      {interviewerText ? (
        <section className="panel">
          <h2>Entrevistadora</h2>
          <p>{interviewerText}</p>
          {audioUrl ? (
            <p className="muted">
              <audio controls src={audioUrl}>
                Reprodução da voz da entrevistadora
              </audio>
            </p>
          ) : null}
          {turnTaken ? (
            <p className="muted">
              Última transcrição: {transcript ? transcript : "(vazia)"}
            </p>
          ) : null}
        </section>
      ) : null}

      {feedback ? (
        <section>
          <article className="block">
            <h2>Pontos positivos</h2>
            <pre>{feedback.pontos_positivos || "—"}</pre>
          </article>
          <article className="block">
            <h2>Pontos de melhoria</h2>
            <pre>{feedback.pontos_de_melhoria || "—"}</pre>
          </article>
          <article className="block">
            <h2>Próximo passo</h2>
            <pre>{feedback.proximo_passo || "—"}</pre>
          </article>
        </section>
      ) : null}
    </main>
  );
}
