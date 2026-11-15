import { ApiError } from "../api/types";

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="panel p-6 text-center">
      <span className="label num animate-pulse">{label} …</span>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <div className="panel p-6 text-center">
      <span className="label">{message}</span>
    </div>
  );
}

const FRIENDLY: Record<string, string> = {
  si_unavailable: "SI service is unavailable (no provider key). Data views below keep working.",
  scoring_disabled: "Ranking is disabled by the operator flag. Data views keep working.",
  network_error: "API unreachable. Start the backend with `make run-api` and retry.",
};

/** Service-level banner: shown in place of a panel, never a blank space. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="panel border-l-2 p-4" style={{ borderLeftColor: "var(--color-alarm)" }}>
      <p className="label" style={{ color: "var(--color-alarm)" }}>
        {error.code} {error.status ? `· ${error.status}` : ""}
      </p>
      <p className="mt-1 text-sm">{FRIENDLY[error.code] ?? error.message}</p>
      {onRetry && (
        <button type="button" className="btn mt-3" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/** Non-blocking notice strip (assumptions, caveats, partial verification). */
export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  const color = tone === "warn" ? "var(--color-warn)" : "var(--color-muted)";
  return (
    <div className="panel px-3 py-2 text-[13px]" style={{ borderLeft: `2px solid ${color}` }}>
      {children}
    </div>
  );
}
