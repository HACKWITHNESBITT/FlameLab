import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Environment, Gap, InvestigationSummary, RankEntry, SiSummary } from "../api/types";
import { useApi } from "../hooks/useApi";
import { SiBlock } from "../components/SiBlock";
import { Empty, ErrorState, Loading, Notice } from "../components/StateViews";

/**
 * Fire-safety insights from research: prevention-ranked records with cited
 * implications, plus the gaps that bound them. Research only — this view must
 * never carry crew procedures; those belong to mission safety authorities.
 */
export default function SafetyPage() {
  const [env, setEnv] = useState("moon_base");
  const [selected, setSelected] = useState<string | null>(null);
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  const rank = useApi(() => api<RankEntry[]>(`/api/rank?environment=${encodeURIComponent(env)}&lens=prevention`), [env]);
  const roster = useApi(() => api<InvestigationSummary[]>("/api/investigations?limit=1000"), []);
  const gaps = useApi(() => api<Gap[]>(`/api/gaps?environment=${encodeURIComponent(env)}`), [env]);

  const top = useMemo(() => (rank.data ?? []).slice(0, 5), [rank.data]);
  const byId = useMemo(() => new Map((roster.data ?? []).map((r) => [r.id, r])), [roster.data]);
  const selectedId = selected && top.some((t) => t.id === selected) ? selected : (top[0]?.id ?? null);

  if (envs.loading || rank.loading || roster.loading) return <Loading label="Loading safety insights" />;
  if (envs.error) return <ErrorState error={envs.error} onRetry={envs.retry} />;
  if (rank.error) return <ErrorState error={rank.error} onRetry={rank.retry} />;
  if (roster.error) return <ErrorState error={roster.error} onRetry={roster.retry} />;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Fire-safety insights</h1>
      <Notice tone="warn">
        Research insights only — FlameLab summarizes test results; it does not give crew fire-response
        procedures. For operations, consult mission safety authorities.
      </Notice>

      <section aria-label="Prevention focus" className="panel">
        <div className="panel-head">
          <span className="label">Prevention focus · top 5</span>
          <label className="flex items-center gap-2 text-sm">
            <span className="label">Environment</span>
            <select aria-label="Environment" className="input" value={env} onChange={(e) => setEnv(e.target.value)}>
              {(envs.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </label>
        </div>
        {top.length === 0 ? (
          <div className="p-3"><Empty message="No ranked investigations for this environment." /></div>
        ) : (
          <ol className="divide-y" style={{ borderColor: "var(--color-edge)" }}>
            {top.map((e, i) => {
              const r = byId.get(e.id);
              const active = selectedId === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(e.id)}
                    className="block w-full px-3 py-2 text-left"
                    style={active ? { backgroundColor: "color-mix(in srgb, var(--color-signal) 8%, transparent)" } : undefined}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="num text-xs" style={{ color: "var(--color-faint)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-semibold">{r?.name ?? e.id}</span>
                      <span className="num ml-auto text-sm">
                        {e.score === null ? (
                          <span style={{ color: "var(--color-faint)" }}>insufficient data</span>
                        ) : (
                          <>
                            <span style={{ color: "var(--color-signal)" }}>{e.score.toFixed(3)}</span>
                            <span className="ml-2 text-xs" style={{ color: "var(--color-faint)" }}>
                              cov {e.evidence.coverage.toFixed(2)}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    {e.flags.length > 0 && (
                      <span className="num mt-0.5 block text-xs" style={{ color: "var(--color-warn)" }}>
                        {e.flags.map((f) => `▲ ${f}`).join(" ")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {selectedId && <ImplicationsPanel id={selectedId} env={env} name={byId.get(selectedId)?.name ?? selectedId} />}

      <section aria-label="What the research cannot tell you" className="panel">
        <div className="panel-head"><span className="label">What the research cannot tell you</span></div>
        <div className="p-3">
          {gaps.loading && <Loading label="Loading gaps" />}
          {gaps.error && <ErrorState error={gaps.error} onRetry={gaps.retry} />}
          {gaps.data && (
            <ul className="space-y-2">
              {gaps.data.map((g) => (
                <li key={g.gap} className="text-sm">
                  <span className="font-semibold">{g.title}</span>
                  <span style={{ color: "var(--color-muted)" }}> — {g.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-label="Safety pillars" className="panel p-3">
        <p className="label mb-2">Safety pillars</p>
        <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
          <div><dt className="num font-semibold">prevention</dt><dd style={{ color: "var(--color-muted)" }}>ignition and material selection</dd></div>
          <div><dt className="num font-semibold">detection</dt><dd style={{ color: "var(--color-muted)" }}>smoke and aerosol sensing</dd></div>
          <div><dt className="num font-semibold">suppression</dt><dd style={{ color: "var(--color-muted)" }}>extinguishment</dd></div>
        </dl>
      </section>
    </div>
  );
}

function ImplicationsPanel({ id, env, name }: { id: string; env: string; name: string }) {
  const si = useApi(() => api<SiSummary>(`/api/si/summary/${encodeURIComponent(id)}?environment=${env}`), [id, env]);
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="label">Implications from </span>
        <Link to={`/investigations/${id}`} className="font-semibold underline" style={{ color: "var(--color-link)" }}>
          {name}
        </Link>
      </p>
      {si.loading && <Loading label="Generating verified summary" />}
      {si.error && <ErrorState error={si.error} onRetry={si.retry} />}
      {si.data && (
        <SiBlock
          title="What it implies for prevention, detection, suppression (SI, cited)"
          items={si.data.interpretation}
          gaps={si.data.gaps}
          passed={si.data.verification.passed}
        />
      )}
    </div>
  );
}
