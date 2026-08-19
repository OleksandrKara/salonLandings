import { useEffect, useRef, useState, type CSSProperties } from "react";

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

interface SquareCard {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
}

const SDK_URL = "https://web.squarecdn.com/v1/square.js";
let sdkLoadPromise: Promise<void> | null = null;

function loadSquareSdk(): Promise<void> {
  if (window.Square) return Promise.resolve();
  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Square payment form"));
      document.head.appendChild(script);
    });
  }
  return sdkLoadPromise;
}

/** Square's own hosted card form (PCI-compliant iframe — this app's own code never sees a raw
 * card number, only the tokenized `source_id` produced by tokenize()). `onReady` hands the parent
 * a tokenize function to call on submit; `onError` surfaces load/init failures so the parent can
 * show a real error instead of a silently broken payment step. */
export function PmuCardField({
  applicationId,
  locationId,
  onReady,
  onError,
}: {
  applicationId: string;
  locationId: string;
  onReady: (tokenize: () => Promise<string>) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<SquareCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadSquareSdk();
        if (cancelled || !window.Square || !containerRef.current) return;
        const payments = window.Square.payments(applicationId, locationId);
        const card = await payments.card();
        await card.attach("#pmu-card-container");
        if (cancelled) {
          await card.destroy();
          return;
        }
        cardRef.current = card;
        setLoading(false);
        onReady(async () => {
          const result = await card.tokenize();
          if (result.status !== "OK" || !result.token) {
            throw new Error(result.errors?.[0]?.message ?? "Please check your card details and try again.");
          }
          return result.token;
        });
      } catch {
        if (!cancelled) onError("Unable to load the payment form. Please refresh and try again.");
      }
    }

    void init();
    return () => {
      cancelled = true;
      cardRef.current?.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {loading ? <div style={styles.loading}>Loading payment form…</div> : null}
      <div id="pmu-card-container" ref={containerRef} style={styles.container} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  loading: { fontSize: 13, color: "var(--color-muted-2)", padding: "10px 0" },
  container: { minHeight: 40 },
};
