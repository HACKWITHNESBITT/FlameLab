import type { RankEntry } from "../api/types";

const SHORT: Record<string, string> = {
  oxygen_overlap: "OXYGEN",
  pressure_overlap: "PRESSURE",
  airflow_match: "AIRFLOW",
  fuel_relevance: "FUEL",
  hardware_scale: "SCALE",
  gravity_relevance: "GRAVITY",
  pillar_fit: "PILLAR",
};

const CX = 170;
const CY = 170;
const R_OUT = 160;
const R_IN = 64;
const GAP = (4 * Math.PI) / 180;

function polar(r: number, a: number): [number, number] {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

/** Annular sector from angle a0 to a1 (radians, clockwise from top). */
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const [x1, y1] = polar(r1, a0);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r0, a1);
  const [x4, y4] = polar(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * Radial segment wheel: one segment per factor, filled proportionally to its
 * score. Unevaluated factors render as dark track with an em dash — never a
 * number. Pure presentation over the same breakdown data.
 */
export function ScoreWheel({ entry }: { entry: RankEntry }) {
  const n = entry.factors.length;
  const span = (2 * Math.PI) / n;
  return (
    <div className="mt-2 flex justify-center" role="img" aria-label={`Factor score wheel for ${entry.id}`}>
      <svg viewBox="0 0 340 340" width="340" height="340" style={{ maxWidth: "100%", height: "auto" }}>
        {entry.factors.map((f, i) => {
          const a0 = -Math.PI / 2 + i * span + GAP / 2;
          const a1 = -Math.PI / 2 + (i + 1) * span - GAP / 2;
          const mid = (a0 + a1) / 2;
          const fillR = f.score === null ? R_IN : R_IN + (R_OUT - R_IN) * f.score;
          // Center the text in the larger region so it never straddles the fill edge.
          const inFill = f.score !== null && f.score >= 0.6;
          const textR = f.score === null || !inFill ? (fillR + R_OUT) / 2 : (R_IN + fillR) / 2;
          const [tx, ty] = polar(textR, mid);
          const ink =
            f.score === null ? "var(--color-faint)" : inFill ? "var(--wheel-ink-fill)" : "var(--wheel-ink-track)";
          return (
            <g key={f.factor}>
              <path d={sector(R_IN, R_OUT, a0, a1)} style={{ fill: "var(--color-wheel-track)" }} />
              {f.score !== null && fillR > R_IN + 1 && (
                <path d={sector(R_IN, fillR, a0, a1)} style={{ fill: "var(--color-wheel-fill)" }} />
              )}
              <text
                x={tx}
                y={ty - 1}
                textAnchor="middle"
                style={{ fill: ink }}
                fontSize="15"
                fontWeight="700"
                fontFamily="ui-monospace, Menlo, Consolas, monospace"
              >
                {f.score === null ? "—" : f.score.toFixed(2)}
              </text>
              <text
                x={tx}
                y={ty + 12}
                textAnchor="middle"
                style={{ fill: ink }}
                fontSize="8.5"
                letterSpacing="0.08em"
                fontFamily="ui-monospace, Menlo, Consolas, monospace"
              >
                {SHORT[f.factor] ?? f.factor}
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={R_IN - 8} style={{ fill: "var(--color-panel)", stroke: "var(--color-edge)" }} />
        <text
          x={CX}
          y={CY + 2}
          textAnchor="middle"
          style={{ fill: "var(--color-signal)" }}
          fontSize="30"
          fontWeight="700"
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
        >
          {entry.score === null ? "—" : entry.score.toFixed(2)}
        </text>
        <text
          x={CX}
          y={CY + 18}
          textAnchor="middle"
          style={{ fill: "var(--color-muted)" }}
          fontSize="9"
          letterSpacing="0.14em"
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
        >
          SCORE
        </text>
      </svg>
    </div>
  );
}
