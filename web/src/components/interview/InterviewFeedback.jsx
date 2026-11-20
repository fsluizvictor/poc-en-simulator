import { FlagIcon, TargetIcon, ThumbIcon } from "../common/icons.jsx";

const BLOCKS = [
  {
    key: "pontos_positivos",
    title: "Positive points",
    className: "feedback-positive",
    icon: <ThumbIcon />,
  },
  {
    key: "pontos_de_melhoria",
    title: "Areas to improve",
    className: "feedback-improve",
    icon: <TargetIcon />,
  },
  {
    key: "proximo_passo",
    title: "Next step",
    className: "feedback-next",
    icon: <FlagIcon />,
  },
];

function blockText(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "—";
  }
  return value.trim();
}

export default function InterviewFeedback({ feedback }) {
  return (
    <div className="feedback-list">
      {BLOCKS.map((block) => (
        <article key={block.key} className={`feedback-card ${block.className}`}>
          <h3>
            <span className="feedback-icon" aria-hidden="true">{block.icon}</span>
            {block.title}
          </h3>
          <p>{blockText(feedback?.[block.key])}</p>
        </article>
      ))}
    </div>
  );
}
