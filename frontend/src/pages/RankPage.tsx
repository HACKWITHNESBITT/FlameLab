import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Environment, InvestigationSummary, Lens, RankEntry } from "../api/types";
import { useApi } from "../hooks/useApi";
import { EnvLensBar } from "../components/EnvLensBar";
import { ScoreBreakdown } from "../components/ScoreBreakdown";
import { Empty, ErrorState, Loading } from "../components/StateViews";

/** Journey 1: environment + lens → ranked list with breakdowns → detail. */
export default function RankPage() {
  const [env, setEnv] = useState("moon_base");
  const [lens, setLens] = useState<Lens>("all");
  const [q, setQ] = useState("");
  const [hardware, setHardware] = useState("");
  const [fuel, setFuel] = useState("");
  const [pillar, setPillar] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  const rank = useApi<RankEntry[]>(
    () => api(`/api/rank?environment=${encodeURIComponent(env)}&lens=${lens}`),
    [env, lens],
  );
  const roster = useApi(() => api<InvestigationSummary[]>("/api/investigations?limit=1000"), []);

  const byId = useMemo(() => new Map((roster.data ?? []).map((r) => [r.id, r])), [roster.data]);
  const opts = useMemo(() => {
    const rows = roster.data ?? [];
    const uniq = (f: (r: InvestigationSummary) => string | null) =>
      [...new Set(rows.map(f).filter((v): v is string => !!v))].sort();
    return {
      hardware: uniq((r) => r.hardware),
      fuel: uniq((r) => r.fuel_class),
      pillar: [...new Set(rows.flatMap((r) => r.pillars))].sort(),
    };
  }, [roster.data]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (rank.data ?? []).filter((e) => {
      const r = byId.get(e.id);
      if (!r) return true;
      if (hardware && r.hardware !== hardware) return false;
      if (fuel && r.fuel_class !== fuel) return false;
      if (pillar && !r.pillars.includes(pillar)) return false;
      if (ql && !r.name.toLowerCase().includes(ql) && !r.id.includes(ql)) return false;
      return true;
    });
  }, [rank.data, byId, q, hardware, fuel, pillar]);

  if (envs.loading || rank.loading || roster.loading) return <Loading label="Loading ranking" />;
  if (envs.error) return <ErrorState error={envs.error} onRetry={envs.retry} />;
  if (rank.error) return <ErrorState error={rank.error} onRetry={rank.retry} />;
  if (roster.error) return <ErrorState error={roster.error} onRetry={roster.retry} />;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Rank investigations for a target atmosphere</h1>
      <EnvLensBar
        environments={envs.data ?? []}
        env={env}
        onEnv={setEnv}
        lens={lens}
        onLens={setLens}
      />
      <div className="panel p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-40 flex-1 text-sm">
            <span className="label">Search</span>
            <input
              className="input mt-1"
              placeholder="name or id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <Filter label="Hardware" value={hardware} onChange={setHardware} options={opts.hardware} />
          <Filter label="Fuel class" value={fuel} onChange={setFuel} options={opts.fuel} />
          <Filter label="Pillar" value={pillar} onChange={setPillar} options={opts.pillar} />
          {(q || hardware || fuel || pillar) && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQ("");
                setHardware("");
                setFuel("");
                setPillar("");
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty message="No investigations match these filters." />
      ) : (
        <ol className="space-y-2">
          {rows.map((e, i) => {
            const r = byId.get(e.id);
            const open = expanded === e.id;
            return (
              <li key={e.id} className="panel px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="num text-xs" style={{ color: "var(--color-faint)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Link to={`/investigations/${e.id}`} className="font-semibold hover:underline">
                    {r?.name ?? e.id}
                  </Link>
                  <span className="num text-xs" style={{ color: "var(--color-faint)" }}>
                    {e.id}
                  </span>
                  <span className="num ml-auto text-sm">
                    {e.score === null ? (
                      <span style={{ color: "var(--color-faint)" }}>insufficient data</span>
                    ) : (
                      <>
                        <span style={{ color: "var(--color-signal)" }}>{e.score.toFixed(3)}</span>
                        <span className="ml-2 text-xs" style={{ color: "var(--color-faint)" }}>
                          rank {e.rank_value.toFixed(3)} · cov {e.evidence.coverage.toFixed(2)}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  <span className="num">{[r?.hardware, r?.fuel_class, r?.gravity_regime].filter(Boolean).join(" · ")}</span>
                  {(r?.pillars ?? []).map((p) => (
                    <span key={p} className="num rounded-sm border px-1" style={{ borderColor: "var(--color-edge)" }}>
                      {p}
                    </span>
                  ))}
                  {e.flags.map((f) => (
                    <span key={f} className="num" style={{ color: "var(--color-warn)" }}>
                      ▲ {f}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn ml-auto"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : e.id)}
                  >
                    {open ? "Hide breakdown" : "Why this rank"}
                  </button>
                </div>
                {open && <ScoreBreakdown entry={e} />}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm">
      <span className="label">{label}</span>
      <select aria-label={label} className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
