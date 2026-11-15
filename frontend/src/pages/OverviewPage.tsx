import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Environment } from "../api/types";
import { useApi } from "../hooks/useApi";

/** Landing tab: what FlameLab is and how to use the dashboard. */
export default function OverviewPage() {
  const health = useApi(() => api<{ status: string; records: number }>("/api/health"), []);
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  return (
    <div className="space-y-4">
      <h1 className="sr-only">FlameLab overview</h1>
      <section aria-label="About FlameLab" className="panel p-5">
        <p className="label">Spacecraft fire-safety research explorer</p>
        <p className="mt-2 max-w-3xl text-xl font-semibold leading-snug">
          Which fire research matters for your atmosphere?
        </p>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--color-muted)" }}>
          FlameLab ranks NASA PSI combustion investigations by relevance to your target
          atmosphere — Moon base, spacecraft, station — and explains every result with
          cited evidence. Pick an environment, work the ranked list, and export what
          you need for modeling.
          {health.data && envs.data && (
            <span className="num ml-2" style={{ color: "var(--color-faint)" }}>
              {health.data.records} investigations · {envs.data.length} environments
            </span>
          )}
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <JourneyCard
          step="1 · Rank"
          to="/rank"
          title="Find what matters"
          body="Select an environment and lens, get a ranked list with per-factor score breakdowns, and open any record."
        />
        <JourneyCard
          step="2 · Investigate"
          to="/conditions"
          title="Check the evidence"
          body="Compare tested oxygen–airflow ranges against your target zone, read verified SI summaries, and inspect conditions and measurements."
        />
        <JourneyCard
          step="3 · Close the gaps"
          to="/gaps"
          title="Mind what is missing"
          body="See named gaps with their bounding records, compare investigations side by side, and export structured fields."
        />
      </div>

      <section aria-label="More views" className="panel">
        <div className="panel-head">
          <span className="label">More views</span>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          <Link to="/compare" className="btn">Compare + export</Link>
          <Link to="/ask" className="btn">Ask the data</Link>
          <Link to="/earth" className="btn">Earth applications</Link>
        </div>
      </section>

      <section aria-label="Ground rules" className="panel p-4 text-[13px]" style={{ color: "var(--color-muted)" }}>
        <p className="label mb-2">Ground rules</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Every number traces to a record field; missing data is shown as missing, never zero.</li>
          <li>SI text carries citations and is verified or hidden — unverified sentences are removed.</li>
          <li>No partial-gravity claims: PSI has microgravity and normal-gravity data only.</li>
          <li>Research summaries only — never crew fire-response procedures.</li>
        </ul>
      </section>
    </div>
  );
}

function JourneyCard({ step, to, title, body }: { step: string; to: string; title: string; body: string }) {
  return (
    <Link to={to} className="panel block p-4 no-underline hover:border-[var(--color-signal)]">
      <p className="num text-xs" style={{ color: "var(--color-signal)" }}>{step}</p>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="mt-1 text-[13px]" style={{ color: "var(--color-muted)" }}>{body}</p>
    </Link>
  );
}
