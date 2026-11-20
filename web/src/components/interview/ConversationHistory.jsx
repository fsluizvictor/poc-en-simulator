import { useEffect, useRef } from "react";
import { UserIcon } from "../common/icons.jsx";

function messageText(message) {
  if (message.text) {
    return message.text;
  }
  if (message.role === "candidate") {
    return "";
  }
  return "—";
}

export default function ConversationHistory({ messages }) {
  const listRef = useRef(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

  return (
    <section className="card conversation-card" aria-labelledby="conversation-title">
      <h2 id="conversation-title">Conversation</h2>
      {messages.length === 0 ? (
        <p className="muted">The conversation will show each question and your transcribed answer.</p>
      ) : (
        <ol className="conversation-list" ref={listRef}>
          {messages.map((message) => {
            const isCandidate = message.role === "candidate";
            const text = messageText(message);
            return (
              <li key={message.id} className={`turn${isCandidate ? " turn-candidate" : ""}`}>
                <span className={`turn-icon${isCandidate ? " is-candidate" : ""}`} aria-hidden="true">
                  <UserIcon size={16} />
                </span>
                <span className={`turn-role${isCandidate ? " is-candidate" : ""}`}>
                  {isCandidate ? "Your response" : "Interviewer"}
                </span>
                {isCandidate && !text ? (
                  <em className="empty-line">Empty transcription</em>
                ) : (
                  <p>{text}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
