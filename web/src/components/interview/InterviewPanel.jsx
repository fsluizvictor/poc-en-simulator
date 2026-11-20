import { CheckIcon, ClockIcon, FlagIcon, GlobeIcon, LayersIcon, LockIcon, TargetIcon, ThumbIcon } from "../common/icons.jsx";
import InterviewFeedback from "./InterviewFeedback.jsx";

const LOCKED = [
  { title: "Positive points", icon: <ThumbIcon size={16} /> },
  { title: "Areas to improve", icon: <TargetIcon size={16} /> },
  { title: "Next step", icon: <FlagIcon size={16} /> },
];

function Detail({ icon, label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-icon" aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

export default function InterviewPanel({
  scenario,
  language,
  sessionLabel,
  lastResponse,
  responseState,
  feedback,
}) {
  return (
    <aside className="side">
      <section className="card" aria-labelledby="details-title">
        <h2 id="details-title">Interview details</h2>
        <dl className="detail-list">
          <Detail icon={<LayersIcon size={16} />} label="Scenario" value={scenario} />
          <Detail icon={<GlobeIcon size={16} />} label="Language" value={language} />
          <Detail icon={<ClockIcon size={16} />} label="Session" value={sessionLabel} />
        </dl>
      </section>

      <section className="card" aria-labelledby="last-response-title">
        <div className="card-heading">
          <h2 id="last-response-title">Last response</h2>
          {responseState === "transcribed" ? (
            <span className="badge badge-ok">
              <CheckIcon />
              Transcribed
            </span>
          ) : null}
          {responseState === "empty" ? <span className="badge">Empty transcription</span> : null}
        </div>
        <p className={`last-response${responseState === "none" ? " muted" : ""}`}>
          {lastResponse}
        </p>
      </section>

      <section className="card" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Session feedback</h2>
        {feedback ? (
          <InterviewFeedback feedback={feedback} />
        ) : (
          <ul className="locked-list">
            {LOCKED.map((item) => (
              <li key={item.title} className="locked-row">
                <span className="locked-icon" aria-hidden="true">{item.icon}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>Available when you finish the interview</small>
                </span>
                <LockIcon />
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
