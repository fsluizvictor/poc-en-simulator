import { SparkIcon } from "../common/icons.jsx";

const STATE_LABEL = {
  speaking: "Speaking",
  listening: "Listening",
  processing: "Processing",
  starting: "Starting",
};

export default function InterviewerAvatar({ mode }) {
  const stateLabel = STATE_LABEL[mode] || "";

  return (
    <figure className="avatar-card">
      <div className="avatar-frame">
        <img src="/interviewer.jpg" alt="AI interviewer" />
        <figcaption className="avatar-name">
          <SparkIcon />
          AI Interviewer
        </figcaption>
        {stateLabel ? (
          <p className={`avatar-state state-${mode}`}>
            {mode === "speaking" ? <span className="mini-meter" aria-hidden="true"><i /><i /><i /></span> : null}
            {stateLabel}
          </p>
        ) : null}
      </div>
    </figure>
  );
}
