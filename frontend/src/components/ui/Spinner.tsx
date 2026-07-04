import styles from "./Spinner.module.css";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.wrapper} role="status">
      <span className={styles.spinner} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
