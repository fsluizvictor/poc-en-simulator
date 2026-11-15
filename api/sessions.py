"""Histórico textual só em memória, pelo tempo da sessão."""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field


@dataclass
class Session:
    id: str
    history: list[dict[str, str]] = field(default_factory=list)


_lock = threading.Lock()
_sessions: dict[str, Session] = {}


def create_session() -> Session:
    session = Session(id=str(uuid.uuid4()))
    with _lock:
        _sessions[session.id] = session
    return session


def get_session(session_id: str) -> Session | None:
    with _lock:
        return _sessions.get(session_id)


def drop_session(session_id: str) -> Session | None:
    with _lock:
        return _sessions.pop(session_id, None)


def clear_all() -> None:
    with _lock:
        _sessions.clear()


def transcript_for_feedback(session: Session) -> str:
    lines: list[str] = []
    for turn in session.history:
        label = "Interviewer" if turn["role"] == "interviewer" else "Candidate"
        lines.append(f"{label}: {turn['text']}")
    return "\n".join(lines)
