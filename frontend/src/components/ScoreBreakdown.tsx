import type { RankEntry } from "../api/types";
import { ScoreWheel } from "./ScoreWheel";

/** Per-factor breakdown table plus a two-sentence explainer (top drivers + largest drag). */
export function ScoreBreakdown({ entry }: { entry: RankEntry }) {
  const evaluated = entry.factors.filter((f) => f.score !== null);
  const byContrib = [...evaluated].sort((a, b) => b.contribution - a.contribution);
  const unevaluated = entry.factors.filter((f) => f.score === null);
  const dragUneval = [...unevaluated].sort((a, b) => b.weight - a.weight)[0];
  const dragEval = [...evaluated].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const drag = dragUneval
    ? `${fmtFactor(dragUneval.factor)} is unevaluated (${reasonFor(entry, dragUneval.factor)})`
    : dragEval
      ? `lowest evaluated factor is ${fmtFactor(dragEval.factor)} at ${dragEval.score?.toFixed(2)}`
      : "no evaluated factors";

  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--color-edge)" }}>
      <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
        {byContrib.length > 0 ? (
          <>
            Top drivers:{" "}
            {byContrib
              .slice(0, 2)
              .map((f) => `${fmtFactor(f.factor)} (+${f.contribution.toFixed(3)})`)
              .join(", ")}
            . Largest drag: {drag}.
          </>
        ) : (
          <>No evaluated factors — {drag}.</>
        )}
      </p>
      <ScoreWheel entry={entry} />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="label text-left">
              <th scope="col" className="pr-3 font-normal">Factor</th>
              <th scope="col" className="pr-3 font-normal">Score</th>
              <th scope="col" className="pr-3 font-normal">Weight</th>
              <th scope="col" className="pr-3 font-normal">Contrib</th>
              <th scope="col" className="font-normal">Fields</th>
            </tr>
          </thead>
          <tbody className="num">
            {entry.factors.map((f) => (
              <tr key={f.factor} className="border-t" style={{ borderColor: "var(--color-edge)" }}>
                <td className="py-1 pr-3">{fmtFactor(f.factor)}</td>
                <td className="py-1 pr-3">
                  {f.score === null ? (
                    <span style={{ color: "var(--color-faint)" }}>n/a</span>
                  ) : (
                    f.score.toFixed(2)
                  )}
                </td>
                <td className="py-1 pr-3">{f.weight}</td>
                <td className="py-1 pr-3">+{f.contribution.toFixed(3)}</td>
                <td className="py-1 text-xs" style={{ color: "var(--color-faint)" }}>
                  {f.fields.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="num mt-2 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="label">Completeness</dt>
          <dd>{entry.evidence.completeness.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="label">Coverage</dt>
          <dd>{entry.evidence.coverage.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="label">Modeling readiness</dt>
          <dd>{entry.modeling_readiness.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="label">Equipment relev.</dt>
          <dd>{entry.equipment_relevance === null ? "n/a" : entry.equipment_relevance.toFixed(2)}</dd>
        </div>
      </dl>
      {entry.evidence.unevaluated.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[13px]" style={{ color: "var(--color-muted)" }}>
          {entry.evidence.unevaluated.map((u) => (
            <li key={u.factor}>
              <span className="num">○ {fmtFactor(u.factor)}</span> — {u.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function reasonFor(entry: RankEntry, factor: string): string {
  return entry.evidence.unevaluated.find((u) => u.factor === factor)?.reason ?? "no reason recorded";
}

function fmtFactor(f: string): string {
  return f.replace(/_/g, " ");
}
