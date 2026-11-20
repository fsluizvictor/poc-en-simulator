const API_ROOT = "http://127.0.0.1:8765";

export class InterviewRequestError extends Error {
  constructor(message, diagnostic = "", status = 0) {
    super(message);
    this.name = "InterviewRequestError";
    this.diagnostic = diagnostic;
    this.status = status;
  }
}

function messageFor(status, detail) {
  if (status === 404) {
    return "This session is no longer available. Start a new interview.";
  }
  if (status === 400) {
    return "This turn needs a captured recording.";
  }
  if (status === 413) {
    return "The recording is too large to send.";
  }
  if (status === 503) {
    return "The interview service is unavailable.";
  }
  if (status === 502 && /não alcançou|nao alcancou|timed out|timeout|URLError/i.test(detail || "")) {
    return "The interview service could not reach the provider. Check the network and try again.";
  }
  if (status === 502 || status >= 500) {
    return "The interview service could not complete this request.";
  }
  return "The interview service rejected this request.";
}

function sanitizeDetail(detail) {
  if (!detail) {
    return "";
  }
  if (/api[_-]?key|gemini_api_key|authorization|bearer\s|AIza[0-9A-Za-z_-]{10,}|x-goog-api-key/i.test(detail)) {
    return "";
  }
  if (/gemini|instru[cç][aã]o ausente|\/prompts\/|traceback|stack trace/i.test(detail) || detail.includes("{")) {
    return "";
  }
  return detail.replace(/\s+/g, " ").slice(0, 180);
}

function devDiagnostic(status, detail) {
  const clean = sanitizeDetail(detail);
  if (status && clean) {
    return `HTTP ${status}. ${clean}`;
  }
  if (status) {
    return `HTTP ${status}`;
  }
  return clean;
}

async function readError(response) {
  let detail = "";
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") {
      detail = body.detail;
    } else if (Array.isArray(body?.detail)) {
      detail = body.detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : ""))
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    detail = "";
  }
  return { status: response.status, detail };
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, options);
  } catch {
    throw new InterviewRequestError(
      "The local interview service could not be reached. Check that the API is running on this machine.",
      "network",
    );
  }
  if (!response.ok) {
    const parsed = await readError(response);
    throw new InterviewRequestError(
      messageFor(parsed.status, parsed.detail),
      devDiagnostic(parsed.status, parsed.detail),
      parsed.status,
    );
  }
  return response.json();
}

export function createSession() {
  return request("/api/sessions", { method: "POST" });
}

export function submitTurn(sessionId, blob) {
  const form = new FormData();
  form.append("audio", blob, "turn.webm");
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/turns`, {
    method: "POST",
    body: form,
  });
}

export function closeSession(sessionId) {
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/end`, {
    method: "POST",
  });
}
