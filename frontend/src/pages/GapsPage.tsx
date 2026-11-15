import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Environment, Gap } from "../api/types";
import { useApi } from "../hooks/useApi";
import { Empty, ErrorState, Loading, Notice } from "../components/StateViews";

/** Journey 3a: what gaps remain for this environment, and what bounds them. */
export default function GapsPage() {
  const [env, setEnv] = useState("moon_base");
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  const gaps = useApi(() => api<Gap[]>(`/api/gaps?environment=${encodeURIComponent(env)}`), [env]);
  const current = (envs.data ?? []).find((e) => e.id === env);

  if (envs.loading || gaps.loading) return <Loading label="Loading gaps" />;
  if (envs.error) return <ErrorState error={envs.error} onRetry={envs.retry} />;
  if (gaps.error) return <ErrorState error={gaps.error} onRetry={gaps.retry} />;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Data gaps</h1>
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        <span className="label">Environment</span>
        <select aria-label="Environment" className="input" value={env} onChange={(e) => setEnv(e.target.value)}>
          {(envs.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      {current?.gravity?.includes("no_data") && (
        <Notice tone="warn">
          ▲ Partial gravity: PSI holds microgravity and normal-gravity results only — nothing at Moon or Mars
          gravity. Surface results below can only bound intermediate gravity, never confirm it.
        </Notice>
      )}
      {(gaps.data ?? []).length === 0 ? (
        <Empty message="No gaps reported for this environment." />
      ) : (
        <div className="space-y-2">
          {(gaps.data ?? []).map((g) => (
            <article key={g.gap} className="panel p-4">
              <p className="num text-xs" style={{ color: "var(--color-signal)" }}>
                {g.gap}
              </p>
              <h2 className="mt-0.5 text-lg font-semibold">{g.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                {g.detail}
              </p>
              {g.bounds.length > 0 && (
                <p className="mt-2 text-[13px]">
                  <span className="label">Bounded by </span>
                  {g.bounds.map((b, i) => (
                    <span key={b}>
                      {i > 0 && " · "}
                      <Link to={`/investigations/${b}`} className="num underline" style={{ color: "var(--color-link)" }}>
                        {b}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="text-[13px]">
        <Link to="/compare" className="underline" style={{ color: "var(--color-link)" }}>
          Compare bounding investigations →
        </Link>
      </p>
    </div>
  );
}
