export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background: "#fbeceb",
        border: "1px solid var(--color-danger)",
        color: "var(--color-danger)",
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <p style={{ margin: 0 }}>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--color-danger)", fontWeight: 600, textDecoration: "underline", cursor: "pointer", padding: 0 }}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
