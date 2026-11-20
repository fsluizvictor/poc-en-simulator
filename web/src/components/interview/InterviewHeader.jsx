import ErrorMessage from "../common/ErrorMessage.jsx";
import StatusIndicator from "../common/StatusIndicator.jsx";
import { ChatIcon } from "../common/icons.jsx";

export default function InterviewHeader({
  scenario,
  statusLabel,
  statusTone,
  canStart,
  canEnd,
  onStart,
  onEnd,
}) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <ChatIcon size={18} />
        </span>
        <span>Interview Practice</span>
      </div>
      <p className="scenario-pill">{scenario}</p>
      <div className="header-actions">
        <StatusIndicator tone={statusTone} label={statusLabel} />
        {canStart ? (
          <button type="button" className="button button-primary" onClick={onStart}>
            Start interview
          </button>
        ) : (
          <button type="button" className="button button-ghost" onClick={onEnd} disabled={!canEnd}>
            End interview
          </button>
        )}
      </div>
    </header>
  );
}

export function InterviewAlerts({ notice, errorMessage, errorDiagnostic, onDismiss }) {
  return (
    <>
      <ErrorMessage message={errorMessage} diagnostic={errorDiagnostic} onDismiss={onDismiss} />
      {notice ? <p className="notice">{notice}</p> : null}
    </>
  );
}
