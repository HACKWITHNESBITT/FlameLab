import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { EarthApplication } from "../api/types";
import { useApi } from "../hooks/useApi";
import { Empty, ErrorState, Loading } from "../components/StateViews";

/** Documented terrestrial applications of the research. Links only, no speculation. */
export default function EarthPage() {
  const apps = useApi(() => api<EarthApplication[]>("/api/earth-applications"), []);

  if (apps.loading) return <Loading label="Loading Earth applications" />;
  if (apps.error) return <ErrorState error={apps.error} onRetry={apps.retry} />;
  if ((apps.data ?? []).length === 0) return <Empty message="No documented Earth applications yet." />;

  return (
    <div className="space-y-2">
      <h1 className="sr-only">Earth applications</h1>
      {(apps.data ?? []).map((a, i) => (
        <article key={i} className="panel p-4">
          <h2 className="font-semibold">{a.application}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>{a.note}</p>
          <p className="num mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
            {a.investigation ? (
              <>
                investigation:{" "}
                <Link to={`/investigations/${a.investigation}`} className="underline" style={{ color: "var(--color-link)" }}>
                  {a.investigation}
                </Link>{" "}
                ·{" "}
              </>
            ) : (
              <>general · </>
            )}
            source:{" "}
            <a className="underline" style={{ color: "var(--color-link)" }} href={a.source} target="_blank" rel="noreferrer">
              {a.source}
            </a>
          </p>
        </article>
      ))}
    </div>
  );
}
