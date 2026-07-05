import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Invisible Cloudflare Turnstile challenge — renders nothing visible, calls onToken once
 * verification completes (usually well before the visitor reaches "Confirm Booking"). Renders
 * nothing at all if VITE_TURNSTILE_SITE_KEY isn't configured yet, so this ships safely before
 * a Cloudflare account exists; the backend's fail-open behavior matches (skips verification
 * when its own secret key is unset).
 */
export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    let pollId: number | undefined;

    function render() {
      const el = containerRef.current;
      if (!window.turnstile || !el || cancelled) return;
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: SITE_KEY,
        size: "invisible",
        callback: (token: string) => { if (!cancelled) onToken(token); },
        "error-callback": () => { if (!cancelled) onToken(null); },
        "expired-callback": () => { if (!cancelled) onToken(null); },
      });
    }

    if (window.turnstile) {
      render();
    } else {
      pollId = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(pollId);
          render();
        }
      }, 150);
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} />;
}
