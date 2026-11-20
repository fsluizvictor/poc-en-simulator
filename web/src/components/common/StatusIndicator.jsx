export default function StatusIndicator({ tone, label }) {
  return (
    <p className={`status-indicator tone-${tone}`}>
      <span className={`status-dot${tone === "live" ? " is-live" : ""}`} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
