import type { ReactNode } from "react";
import styles from "./StepShell.module.css";

interface StepShellProps {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function StepShell({ title, subtitle, step, totalSteps, onBack, children, footer }: StepShellProps) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        {onBack ? (
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="Go back">
            ←
          </button>
        ) : (
          <span className={styles.backSpacer} />
        )}
        <div className={styles.progress} aria-hidden>
          {Array.from({ length: totalSteps }, (_, i) => (
            <span key={i} className={i < step ? styles.dotActive : styles.dot} />
          ))}
        </div>
      </header>

      <div className="container">
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>

        <div className={styles.content}>{children}</div>
      </div>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
