export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0", color: "var(--color-muted-2)", fontSize: 14 }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "3px solid var(--color-border)",
          borderTopColor: "var(--color-accent)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
