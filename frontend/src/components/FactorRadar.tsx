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

/** Series palette follows the theme (green, orange-red, sky in dark mode). */
const seriesVar = (i: number) => `var(--radar-c${i % 3})`;

const W = 560;
const H = 420;
const CX = W / 2;
const CY = H / 2 + 10;
const R = 150;
const RINGS = [0.25, 0.5, 0.75, 1];

function polar(r: number, a: number): [number, number] {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function angle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

/**
 * Overlaid factor-score radar for 2–3 investigations. Segments are drawn only
 * between adjacent evaluated points, so unevaluated factors leave real gaps —
 * never plotted as zero. Pure presentation over rank data.
 */
export function FactorRadar({ ids, entries }: { ids: string[]; entries: RankEntry[] }) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const factors = entries[0]?.factors ?? entries[1]?.factors ?? [];
  const n = factors.length;
  const series = ids.map((id, i) => ({
    id,
    color: seriesVar(i),
    values: factors.map((f) => byId.get(id)?.factors.find((x) => x.factor === f.factor)?.score ?? null),
  }));

  return (
    <div className="radar-stage flex flex-col items-center gap-1 overflow-x-auto p-2" role="img" aria-label={`Factor radar for ${ids.join(", ")}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ maxWidth: "100%", height: "auto" }}>
        <defs>
          <filter id="radar-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {RINGS.map((t) => (
          <polygon
            key={t}
            points={factors.map((_, i) => polar(R * t, angle(i, n)).join(",")).join(" ")}
            fill="none"
            style={{ stroke: "var(--radar-grid)" }}
            strokeWidth="1"
          />
        ))}
        {factors.map((f, i) => {
          const [x2, y2] = polar(R, angle(i, n));
          const [lx, ly] = polar(R + 20, angle(i, n));
          const cos = Math.cos(angle(i, n));
          return (
            <g key={f.factor}>
              <line x1={CX} y1={CY} x2={x2} y2={y2} style={{ stroke: "var(--radar-grid)" }} strokeWidth="1" />
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end"}
                dominantBaseline="middle"
                style={{ fill: "var(--radar-label)" }}
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {SHORT[f.factor] ?? f.factor}
              </text>
            </g>
          );
        })}
        {[0.5, 1].map((t) => {
          const [, y] = polar(R * t, -Math.PI / 2);
          return (
            <text key={t} x={CX + 5} y={y - 3} style={{ fill: "var(--color-faint)" }} fontSize="9" fontFamily="ui-monospace, monospace">
              {t.toFixed(1)}
            </text>
          );
        })}
        {series.map((s) => (
          <g key={s.id} filter="url(#radar-glow)">
            {s.values.map((v, i) => {
              const w = s.values[(i + 1) % n];
              if (v === null || w === null) return null;
              const [x1, y1] = polar(R * v, angle(i, n));
              const [x2, y2] = polar(R * w, angle((i + 1) % n, n));
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: s.color }} strokeWidth="2" />;
            })}
            {s.values.map((v, i) => {
              if (v === null) return null;
              const [x, y] = polar(R * v, angle(i, n));
              return <circle key={i} cx={x} cy={y} r="4" style={{ fill: s.color }} />;
            })}
          </g>
        ))}
      </svg>
      <div className="num flex flex-wrap justify-center gap-4 text-xs" aria-label="Series legend">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.id}
          </span>
        ))}
        <span style={{ color: "var(--color-faint)" }}>gaps = unevaluated</span>
      </div>
    </div>
  );
}
