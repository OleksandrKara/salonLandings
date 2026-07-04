import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  selected?: boolean;
  as?: "div" | "button";
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  className?: string;
}

export function Card({ children, selected = false, as = "div", onClick, className }: CardProps) {
  const classes = [styles.card, selected ? styles.selected : "", className].filter(Boolean).join(" ");

  if (as === "button") {
    return (
      <button type="button" className={classes} onClick={onClick} aria-pressed={selected}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}
