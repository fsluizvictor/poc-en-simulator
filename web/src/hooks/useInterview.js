import { useEffect, useRef, useState } from "react";
import {
  InterviewRequestError,
  closeSession,
  createSession,
  submitTurn,
} from "../services/interviewApi.js";

const STATUS = {
  IDLE: ["Not started", "idle"],
  INITIALIZING: ["Starting", "wait"],
  AI_SPEAKING: ["Interviewer speaking", "live"],
  READY: ["Session active", "live"],
  LISTENING: ["Recording", "live"],
  PROCESSING: ["Processing", "wait"],
  COMPLETED: ["Session ended", "done"],
  ERROR: ["Needs attention", "alert"],
};

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

function formatElapsed(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function mapMicError(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return {
      permission: "denied",
      message: "Microphone permission was denied. Allow the microphone in the browser and try again.",
      diagnostic: name,
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      permission: "missing",
      message: "No microphone was found on this computer.",
      diagnostic: name,
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      permission: "busy",
      message: "The microphone could not be opened. It may be in use by another application.",
      diagnostic: name,
    };
  }
  return {
    permission: "unknown",
    message: "The microphone could not be opened.",
    diagnostic: name || "unknown",
  };
}

export function useInterview() {
  const [phase, setPhase] = useState("idle");
  const [playback, setPlayback] = useState("idle");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [stream, setStream] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micPermission, setMicPermission] = useState("unknown");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDiagnostic, setErrorDiagnostic] = useState("");
  const [notice, setNotice] = useState("");

  const phaseRef = useRef("idle");
  const playbackRef = useRef("idle");
  const sessionIdRef = useRef("");
  const audioUrlRef = useRef("");
  const playerRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const shouldSubmitRef = useRef(false);
  const actionLock = useRef(false);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(0);

  function changePhase(next) {
    phaseRef.current = next;
    setPhase(next);
  }

  function changePlayback(next) {
    playbackRef.current = next;
    setPlayback(next);
  }

  function clearError() {
    setErrorMessage("");
    setErrorDiagnostic("");
    if (phaseRef.current === "error") {
      changePhase("idle");
    }
  }

  function showError(message, diagnostic = "") {
    setErrorMessage(message);
    setErrorDiagnostic(import.meta.env.DEV ? diagnostic : "");
  }

  function applyRequestError(error) {
    if (error instanceof InterviewRequestError) {
      showError(error.message, error.diagnostic);
      return;
    }
    showError("Something went wrong before the interview service responded.");
  }

  function replaceAudio(nextUrl) {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = nextUrl || "";
    setAudioUrl(nextUrl || "");
  }

  function stopPlayback() {
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      player.onended = null;
      player.onerror = null;
      player.pause();
    }
    changePlayback("idle");
  }

  async function playUrl(url) {
    stopPlayback();
    const player = new Audio(url);
    playerRef.current = player;
    player.onended = () => {
      if (playerRef.current !== player || !mountedRef.current) {
        return;
      }
      playerRef.current = null;
      changePlayback("idle");
    };
    player.onerror = () => {
      if (playerRef.current !== player || !mountedRef.current) {
        return;
      }
      playerRef.current = null;
      changePlayback("failed");
      showError("The interviewer audio could not be played. Use Replay interviewer.");
    };
    changePlayback("playing");
    try {
      await player.play();
    } catch (error) {
      if (playerRef.current !== player || !mountedRef.current) {
        return;
      }
      playerRef.current = null;
      changePlayback("failed");
      if (error?.name === "NotAllowedError") {
        showError("The browser blocked automatic playback. Use Replay interviewer.");
      } else {
        showError("The interviewer audio could not be played. Use Replay interviewer.");
      }
    }
  }

  async function playInterviewer(payload) {
    if (!payload?.audio_base64) {
      changePlayback("failed");
      showError("The interviewer audio did not arrive. You can keep reading the question.");
      return;
    }
    try {
      const url = decodeAudio(payload.audio_base64, payload.audio_mime_type);
      replaceAudio(url);
      await playUrl(url);
    } catch {
      if (!mountedRef.current) {
        return;
      }
      changePlayback("failed");
      showError("The interviewer audio could not be played. Use Replay interviewer.");
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      shouldSubmitRef.current = false;
      actionLock.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        player.onended = null;
        player.onerror = null;
        player.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "listening") {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function sendTurn(blob) {
    try {
      const payload = await submitTurn(sessionIdRef.current, blob);
      if (!mountedRef.current) {
        return;
      }
      setNotice(
        payload.transcript
          ? ""
          : "This turn's transcription came back empty.",
      );
      setMessages((current) => {
        const candidateOrder = current.length + 1;
        return [
          ...current,
          {
            id: `candidate-${candidateOrder}`,
            role: "candidate",
            text: payload.transcript || "",
            order: candidateOrder,
          },
          {
            id: `interviewer-${candidateOrder + 1}`,
            role: "interviewer",
            text: payload.interviewer_text || "",
            order: candidateOrder + 1,
          },
        ];
      });
      changePhase("ready");
      actionLock.current = false;
      await playInterviewer(payload);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      changePhase("ready");
      applyRequestError(error);
    } finally {
      actionLock.current = false;
    }
  }

  async function startSession() {
    if (actionLock.current) {
      return;
    }
    const current = phaseRef.current;
    if (current !== "idle" && current !== "error" && current !== "completed") {
      return;
    }
    actionLock.current = true;
    clearError();
    stopPlayback();
    changePhase("initializing");
    try {
      const payload = await createSession();
      if (!mountedRef.current) {
        return;
      }
      sessionIdRef.current = payload.session_id || "";
      setSessionId(sessionIdRef.current);
      setFeedback(null);
      setNotice("");
      setMessages([
        {
          id: "interviewer-1",
          role: "interviewer",
          text: payload.interviewer_text || "",
          order: 1,
        },
      ]);
      changePhase("ready");
      actionLock.current = false;
      await playInterviewer(payload);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      sessionIdRef.current = "";
      setSessionId("");
      changePhase("error");
      applyRequestError(error);
    } finally {
      if (phaseRef.current !== "processing" && phaseRef.current !== "listening") {
        actionLock.current = false;
      }
    }
  }

  async function beginRecording() {
    if (actionLock.current || phaseRef.current !== "ready" || playbackRef.current === "playing") {
      return;
    }
    clearError();
    chunksRef.current = [];
    let nextStream;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const mapped = mapMicError(error);
      setMicPermission(mapped.permission);
      showError(mapped.message, mapped.diagnostic);
      return;
    }
    if (!mountedRef.current || phaseRef.current !== "ready" || playbackRef.current === "playing") {
      nextStream.getTracks().forEach((track) => track.stop());
      return;
    }
    setMicPermission("granted");
    let recorder;
    try {
      const mimeType = pickRecorderMime();
      recorder = mimeType
        ? new MediaRecorder(nextStream, { mimeType })
        : new MediaRecorder(nextStream);
    } catch {
      nextStream.getTracks().forEach((track) => track.stop());
      showError("This browser could not start a recording.");
      return;
    }

    recorderRef.current = recorder;
    streamRef.current = nextStream;
    setStream(nextStream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      nextStream.getTracks().forEach((track) => track.stop());
      if (streamRef.current === nextStream) {
        streamRef.current = null;
      }
      if (mountedRef.current) {
        setStream(null);
      }
      if (!shouldSubmitRef.current) {
        actionLock.current = false;
        return;
      }
      shouldSubmitRef.current = false;
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      chunksRef.current = [];
      sendTurn(blob);
    };
    try {
      recorder.start();
    } catch {
      nextStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      if (mountedRef.current) {
        setStream(null);
      }
      showError("This browser could not start a recording.");
      return;
    }
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    changePhase("listening");
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording" || actionLock.current) {
      return;
    }
    actionLock.current = true;
    shouldSubmitRef.current = true;
    changePhase("processing");
    try {
      recorder.stop();
    } catch {
      shouldSubmitRef.current = false;
      actionLock.current = false;
      changePhase("ready");
      showError("The recording could not be sent.");
    }
  }

  async function replayInterviewer() {
    if (!audioUrlRef.current || playbackRef.current === "playing") {
      return;
    }
    const current = phaseRef.current;
    if (current === "initializing" || current === "listening" || current === "processing") {
      return;
    }
    clearError();
    await playUrl(audioUrlRef.current);
  }

  async function endSession() {
    if (actionLock.current || !sessionIdRef.current) {
      return;
    }
    const current = phaseRef.current;
    if (current === "listening" || current === "processing" || current === "initializing") {
      return;
    }
    actionLock.current = true;
    clearError();
    stopPlayback();
    changePhase("processing");
    try {
      const payload = await closeSession(sessionIdRef.current);
      if (!mountedRef.current) {
        return;
      }
      setFeedback({
        pontos_positivos: payload?.pontos_positivos || "",
        pontos_de_melhoria: payload?.pontos_de_melhoria || "",
        proximo_passo: payload?.proximo_passo || "",
      });
      sessionIdRef.current = "";
      setSessionId("");
      changePhase("completed");
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      changePhase("ready");
      applyRequestError(error);
    } finally {
      actionLock.current = false;
    }
  }

  const visualState = playback === "playing"
    ? "AI_SPEAKING"
    : {
      idle: "IDLE",
      initializing: "INITIALIZING",
      ready: "READY",
      listening: "LISTENING",
      processing: "PROCESSING",
      completed: "COMPLETED",
      error: "ERROR",
    }[phase] || "IDLE";

  const [statusLabel, statusTone] = STATUS[visualState] || STATUS.IDLE;
  const elapsedLabel = formatElapsed(elapsedMs);

  let micLabel = "Start the interview to record";
  let micTone = "idle";
  if (visualState === "LISTENING") {
    micLabel = `Recording · ${elapsedLabel}`;
    micTone = "live";
  } else if (visualState === "AI_SPEAKING") {
    micLabel = "Wait for the interviewer to finish";
  } else if (visualState === "PROCESSING" || visualState === "INITIALIZING") {
    micLabel = visualState === "INITIALIZING" ? "Opening the interview" : "Sending your answer";
    micTone = "wait";
  } else if (micPermission === "denied") {
    micLabel = "Microphone permission was denied";
    micTone = "alert";
  } else if (micPermission === "missing") {
    micLabel = "No microphone was found";
    micTone = "alert";
  } else if (micPermission === "busy") {
    micLabel = "The microphone is unavailable";
    micTone = "alert";
  } else if (visualState === "READY" && micPermission === "granted") {
    micLabel = "Your microphone is ready";
    micTone = "ready";
  } else if (visualState === "READY") {
    micLabel = "The microphone is requested when you record";
    micTone = "ready";
  } else if (visualState === "COMPLETED") {
    micLabel = "Session ended";
  } else if (visualState === "ERROR") {
    micLabel = "Start the interview to record";
  }

  const sessionLabel = visualState === "COMPLETED"
    ? "Ended"
    : sessionId
      ? "Active"
      : "Not started";

  return {
    visualState,
    statusLabel,
    statusTone,
    sessionLabel,
    messages,
    feedback,
    stream,
    notice,
    errorMessage,
    errorDiagnostic,
    micLabel,
    micTone,
    canStart: phase === "idle" || phase === "error" || phase === "completed",
    canReplay: Boolean(audioUrl)
      && playback !== "playing"
      && phase !== "initializing"
      && phase !== "listening"
      && phase !== "processing",
    canRecord: phase === "ready" && playback !== "playing",
    canStop: phase === "listening",
    canEnd: Boolean(sessionId)
      && phase !== "listening"
      && phase !== "processing"
      && phase !== "initializing",
    startSession,
    beginRecording,
    stopRecording,
    replayInterviewer,
    endSession,
    dismissError: clearError,
  };
}
