import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App.jsx";
import { finishPlayback, installMedia, media } from "./mediaHarness.js";

const OPENING = "Tell me about a challenging project.";
const FOLLOW_UP = "What was your role on that project?";
const ANSWER = "I improved a distributed system.";
const API = "http://127.0.0.1:8765";

const openingPayload = {
  session_id: "session-1",
  interviewer_text: OPENING,
  audio_base64: "QQ==",
  audio_mime_type: "audio/wav",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetch(handler) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  installMedia();
});

afterEach(() => {
  media.restoreAppend?.();
});

function renderApp() {
  return render(<App />);
}

async function openInterview(fetchMock) {
  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
  expect((await screen.findAllByText(OPENING)).length).toBeGreaterThan(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  act(() => finishPlayback());
  expect(await screen.findByRole("button", { name: /The microphone is requested when you record/ })).toBeEnabled();
}

test("the idle screen offers one scenario and keeps recording closed", () => {
  renderApp();

  expect(screen.getAllByText("Entrevista de emprego — Tecnologia")).toHaveLength(2);
  expect(screen.queryByText(/Software Engineer/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  expect(screen.getAllByText("Not started").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Start interview" })).toBeEnabled();
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Replay interviewer" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Stop and send" })).toBeDisabled();
  expect(screen.getAllByText("Available when you finish the interview")).toHaveLength(3);
  expect(screen.getByText("Start the interview to hear the first question.")).toBeInTheDocument();
});

test("opening a session posts to the local API and blocks recording while the interviewer speaks", async () => {
  const fetchMock = installFetch(async (url, init) => {
    expect(url).toBe(`${API}/api/sessions`);
    expect(init.method).toBe("POST");
    expect(JSON.stringify(init.headers || {})).not.toMatch(/api[_-]?key|authorization|bearer/i);
    return jsonResponse(openingPayload);
  });
  renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

  expect(await screen.findByText("Interviewer speaking")).toBeInTheDocument();
  expect(screen.getByText("Speaking")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeDisabled();
  expect(screen.getByText("Wait for the interviewer to finish")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();

  const conversation = within(screen.getByRole("region", { name: "Conversation" }));
  expect(conversation.getByText("Interviewer")).toBeInTheDocument();
  expect(conversation.getByText(OPENING)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  act(() => finishPlayback());

  expect(await screen.findByText("Session active")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Replay interviewer" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "End interview" })).toBeEnabled();
});

test("a second start is ignored while the session request is still open", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const fetchMock = installFetch(() => gate.then(() => jsonResponse(openingPayload)));
  renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));
  expect((await screen.findAllByText("Starting")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "End interview" }));
  expect(fetchMock).toHaveBeenCalledTimes(1);

  release();
  expect((await screen.findAllByText(OPENING)).length).toBeGreaterThan(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("a missing service key stays out of the screen", async () => {
  installFetch(async () => jsonResponse({
    detail: "GEMINI_API_KEY não está definida no ambiente do processo da API.",
  }, 503));
  renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("The interview service is unavailable.");
  expect(document.body.textContent).not.toMatch(/GEMINI_API_KEY|AIza|api[_-]?key/i);
  expect(screen.getByText("Needs attention")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getAllByText("Not started").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Start interview" })).toBeEnabled();
});

test("a network failure names the local service without a stack", async () => {
  installFetch(async () => {
    throw new TypeError("Failed to fetch");
  });
  renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("The local interview service could not be reached. Check that the API is running on this machine.");
  expect(alert).not.toHaveTextContent("Failed to fetch");
});

test("blocked playback leaves the question readable and replay available", async () => {
  media.playError = new DOMException("blocked", "NotAllowedError");
  installFetch(async () => jsonResponse(openingPayload));
  renderApp();

  fireEvent.click(screen.getByRole("button", { name: "Start interview" }));

  expect((await screen.findAllByText(OPENING)).length).toBeGreaterThan(0);
  expect(await screen.findByRole("alert")).toHaveTextContent("The browser blocked automatic playback. Use Replay interviewer.");
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Replay interviewer" })).toBeEnabled();
});

test("a turn posts the recording and keeps an empty transcription empty", async () => {
  const fetchMock = installFetch(async (url, init) => {
    if (url === `${API}/api/sessions`) {
      return jsonResponse(openingPayload);
    }
    expect(url).toBe(`${API}/api/sessions/session-1/turns`);
    expect(init.method).toBe("POST");
    expect(media.appended).toEqual([
      expect.objectContaining({ name: "audio", filename: "turn.webm" }),
    ]);
    return jsonResponse({
      transcript: "",
      interviewer_text: FOLLOW_UP,
      audio_base64: "QQ==",
      audio_mime_type: "audio/wav",
    });
  });
  renderApp();
  await openInterview(fetchMock);

  fireEvent.click(screen.getByRole("button", { name: /Record your answer/ }));
  expect(await screen.findByText(/Recording · 0:00/)).toBeInTheDocument();
  expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true });
  expect(screen.getByRole("button", { name: "End interview" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Replay interviewer" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Stop and send" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "Stop and send" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop and send" }));

  expect(await screen.findByText("This turn's transcription came back empty.")).toBeInTheDocument();
  expect(screen.getAllByText("Empty transcription").length).toBeGreaterThan(0);
  expect(screen.queryByText(ANSWER)).not.toBeInTheDocument();
  expect(screen.getAllByText(FOLLOW_UP).length).toBeGreaterThan(0);

  const conversation = within(screen.getByRole("region", { name: "Conversation" }));
  const roles = conversation.getAllByText(/Interviewer|Your response/).map((node) => node.textContent);
  expect(roles).toEqual(["Interviewer", "Your response", "Interviewer"]);
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/turns"))).toHaveLength(1);

  act(() => finishPlayback());
  expect(await screen.findByText("Session active")).toBeInTheDocument();
  expect(media.tracks[0].stop).toHaveBeenCalled();
});

test("a successful turn shows the transcript and then the three feedback blocks", async () => {
  const fetchMock = installFetch(async (url) => {
    if (url === `${API}/api/sessions`) {
      return jsonResponse(openingPayload);
    }
    if (String(url).endsWith("/turns")) {
      return jsonResponse({
        transcript: ANSWER,
        interviewer_text: FOLLOW_UP,
        audio_base64: "QQ==",
        audio_mime_type: "audio/wav",
      });
    }
    expect(url).toBe(`${API}/api/sessions/session-1/end`);
    return jsonResponse({
      pontos_positivos: "Clear examples.",
      pontos_de_melhoria: "",
      proximo_passo: "Practice one story.",
    });
  });
  renderApp();
  await openInterview(fetchMock);

  fireEvent.click(screen.getByRole("button", { name: /Record your answer/ }));
  await screen.findByText(/Recording · 0:00/);
  fireEvent.click(screen.getByRole("button", { name: "Stop and send" }));

  expect((await screen.findAllByText(ANSWER)).length).toBeGreaterThan(0);
  expect(screen.getByText("Transcribed")).toBeInTheDocument();
  expect(screen.queryByText("This turn's transcription came back empty.")).not.toBeInTheDocument();

  act(() => finishPlayback());
  await screen.findByRole("button", { name: "End interview" });
  fireEvent.click(screen.getByRole("button", { name: "End interview" }));

  expect(await screen.findByText("Clear examples.")).toBeInTheDocument();
  expect(screen.getByText("Practice one story.")).toBeInTheDocument();
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Positive points" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Areas to improve" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Next step" })).toBeInTheDocument();
  expect(screen.queryByText("Available when you finish the interview")).not.toBeInTheDocument();
  expect(screen.getAllByText("Session ended").length).toBeGreaterThan(0);
  expect(screen.getByText("Ended")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start interview" })).toBeEnabled();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    `${API}/api/sessions`,
    `${API}/api/sessions/session-1/turns`,
    `${API}/api/sessions/session-1/end`,
  ]);
});

test("microphone denial stays on the screen and does not send audio", async () => {
  const fetchMock = installFetch(async () => jsonResponse(openingPayload));
  media.getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  renderApp();
  await openInterview(fetchMock);

  fireEvent.click(screen.getByRole("button", { name: /Record your answer/ }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Microphone permission was denied. Allow the microphone in the browser and try again.");
  expect(screen.getByText("Microphone permission was denied")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeEnabled();
});

test("a rejected turn keeps the session open for another answer", async () => {
  const fetchMock = installFetch(async (url) => {
    if (String(url).endsWith("/turns")) {
      return jsonResponse({ detail: "O turno exige áudio capturado." }, 400);
    }
    return jsonResponse(openingPayload);
  });
  renderApp();
  await openInterview(fetchMock);

  fireEvent.click(screen.getByRole("button", { name: /Record your answer/ }));
  await screen.findByText(/Recording · 0:00/);
  fireEvent.click(screen.getByRole("button", { name: "Stop and send" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("This turn needs a captured recording.");
  expect(screen.getAllByText(OPENING).length).toBeGreaterThan(0);
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Record your answer/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: "End interview" })).toBeEnabled();
});

test("leaving the screen during recording releases the microphone and does not send the turn", async () => {
  const fetchMock = installFetch(async () => jsonResponse(openingPayload));
  const view = renderApp();
  await openInterview(fetchMock);

  fireEvent.click(screen.getByRole("button", { name: /Record your answer/ }));
  await screen.findByText(/Recording · 0:00/);
  view.unmount();

  expect(media.tracks[0].stop).toHaveBeenCalled();
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/turns"))).toBe(false);
});
