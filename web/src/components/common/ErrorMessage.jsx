export default function ErrorMessage({ message, diagnostic, onDismiss }) {
  if (!message) {
    return null;
  }

  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      <button type="button" className="error-dismiss" onClick={onDismiss}>
        Dismiss
      </button>
      {import.meta.env.DEV && diagnostic ? (
        <details className="error-diagnostic">
          <summary>Diagnostic</summary>
          <p>{diagnostic}</p>
        </details>
      ) : null}
    </div>
  );
}
