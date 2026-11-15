import type { Environment, Lens } from "../api/types";

const LENSES: { id: Lens; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prevention", label: "Prevention" },
  { id: "detection", label: "Detection" },
  { id: "suppression", label: "Suppression" },
];

export function EnvLensBar({
  environments,
  env,
  onEnv,
  lens,
  onLens,
}: {
  environments: Environment[];
  env: string;
  onEnv: (id: string) => void;
  lens: Lens;
  onLens: (l: Lens) => void;
}) {
  const current = environments.find((e) => e.id === env);
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">Target atmosphere · Lens</span>
        {current && (
          <span className="num text-xs" style={{ color: "var(--color-faint)" }}>
            O₂ {fmtRange(current.oxygen_percent)} · {fmtRange(current.pressure_psi)} psi
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 p-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="label">Environment</span>
          <select aria-label="Environment" className="input" value={env} onChange={(e) => onEnv(e.target.value)}>
            {environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Lens" className="flex items-center gap-1.5">
          {LENSES.map((l) => (
            <button
              key={l.id}
              type="button"
              className="btn"
              aria-pressed={lens === l.id}
              style={lens === l.id ? { borderColor: "var(--color-signal)", color: "var(--color-signal)" } : undefined}
              onClick={() => onLens(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {current && ((current.assumptions?.length ?? 0) > 0 || current.gravity_note) && (
        <div className="border-t px-3 py-2 text-[13px]" style={{ borderColor: "var(--color-edge)" }}>
          {current.gravity?.includes("no_data") && (
            <p style={{ color: "var(--color-warn)" }}>
              ▲ Partial-gravity environment: PSI has no Moon/Mars-g combustion data; micro/normal-g results only bound
              it.
            </p>
          )}
          {current.gravity_note && <p style={{ color: "var(--color-muted)" }}>{current.gravity_note}</p>}
          {(current.assumptions ?? []).map((a) => (
            <p key={a} style={{ color: "var(--color-muted)" }}>
              Assumption: {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtRange(r: { min: number | null; max: number | null }): string {
  if (r.min === null && r.max === null) return "—";
  if (r.min !== null && r.max !== null) return r.min === r.max ? String(r.min) : `${r.min}–${r.max}`;
  if (r.min !== null) return `≥${r.min}`;
  return `≤${r.max}`;
}
