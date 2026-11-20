import { MicIcon, PlayIcon, SendIcon } from "../common/icons.jsx";

export default function AudioControls({
  canReplay,
  canRecord,
  canStop,
  onReplay,
  onRecord,
  onStop,
  micLabel,
  micTone,
}) {
  return (
    <div className="controls">
      <button type="button" className="button button-replay" onClick={onReplay} disabled={!canReplay}>
        <PlayIcon />
        Replay interviewer
      </button>
      <span className="controls-divider" aria-hidden="true" />
      <button type="button" className="record-button" onClick={onRecord} disabled={!canRecord}>
        <span className="record-orb">
          <MicIcon />
        </span>
        <span className="record-copy">
          <strong>Record your answer</strong>
          <small className={`mic-state tone-${micTone}`}>
            <span className={`status-dot${micTone === "live" ? " is-live" : ""}`} aria-hidden="true" />
            {micLabel}
          </small>
        </span>
      </button>
      <button type="button" className="button button-stop" onClick={onStop} disabled={!canStop}>
        <SendIcon />
        Stop and send
      </button>
    </div>
  );
}
