import { QUANTITIES, type ChartRow, type QuantityKey } from "./conditionsMeta";

const W = 880;
const LABEL_W = 132;
const PAD_R = 16;
const HEADER_H = 30;
const AXIS_H = 34;
const BAR_H = 9;
const BAR_STEP = 12;
const MAX_BARS = 5;
const MONO = "ui-monospace, Menlo, Consolas, monospace";

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * base) return m * base;
  }
  return 10 * base;
}

function fmtRange(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return min === max ? String(min) : `${min}–${max}`;
  if (min !== null) return `≥${min}`;
  if (max !== null) return `≤${max}`;
  return "—";
}

/**
 * Range-strip chart: one row per investigation, tested ranges as bars against
 * the environment target band. Records with no data for the quantity get an
 * explicit NO DATA row — never a zero, never hidden.
 */
export function ConditionsChart({
  rows,
  zone,
  zoneLabel,
  quantity,
}: {
  rows: ChartRow[];
  zone: { min: number | null; max: number | null } | null;
  zoneLabel: string;
  quantity: QuantityKey;
}) {
  const meta = QUANTITIES[quantity];
  const dataMax = Math.max(
    0,
    ...rows.flatMap((r) => r.ranges.flatMap((g) => [g.min ?? 0, g.max ?? 0])),
  );
  const dMin = 0;
  const dMax =
    quantity === "oxygen" ? 100 : niceCeil(Math.max(quantity === "pressure" ? 20 : 10, dataMax, zone?.max ?? 0));
  const plotW = W - LABEL_W - PAD_R;
  const x = (v: number) => LABEL_W + ((v - dMin) / (dMax - dMin)) * plotW;

  const rowH = (n: number) => Math.max(34, 16 + Math.min(n, MAX_BARS) * BAR_STEP);
  const heights = rows.map((r) => rowH(r.ranges.length));
  const H = HEADER_H + heights.reduce((a, b) => a + b, 0) + AXIS_H;
  const tops: number[] = [];
  heights.reduce((acc, h) => {
    tops.push(HEADER_H + acc);
    return acc + h;
  }, 0);

  const ticks = [0, 1, 2, 3, 4, 5].map((i) => dMin + ((dMax - dMin) * i) / 5);
  const z0 = zone ? (zone.min ?? dMin) : null;
  const z1 = zone ? (zone.max ?? dMax) : null;
  const withData = rows.filter((r) => r.ranges.length > 0).length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${meta.label} test ranges versus ${zoneLabel}`}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={x(t)} y1={HEADER_H - 6} x2={x(t)} y2={H - AXIS_H}
              style={{ stroke: "var(--color-gridline)" }} strokeWidth="1"
            />
            <text
              x={x(t)} y={H - AXIS_H + 18} textAnchor="middle"
              style={{ fill: "var(--color-muted)" }} fontSize="10" fontFamily={MONO}
            >
              {Number(t.toPrecision(4))}
            </text>
          </g>
        ))}
        {z0 !== null && z1 !== null && (
          <g>
            <rect
              x={x(Math.max(z0, dMin))} y={HEADER_H - 6}
              width={Math.max(2, x(Math.min(z1, dMax)) - x(Math.max(z0, dMin)))}
              height={H - AXIS_H - HEADER_H + 6}
              style={{ fill: "var(--zone-fill)", stroke: "var(--color-signal)" }}
              strokeWidth="1.5" strokeDasharray="6 4"
            />
            <text
              x={Math.min(x(Math.max(z0, dMin)) + 6, W - PAD_R - 150)} y={HEADER_H - 10}
              style={{ fill: "var(--color-signal)" }} fontSize="11" fontFamily={MONO}
            >
              {`TARGET · ${zoneLabel}`}
            </text>
          </g>
        )}
        {rows.map((r, ri) => {
          const top = tops[ri];
          const mid = top + heights[ri] / 2;
          const shown = r.ranges.slice(0, MAX_BARS);
          const y0 = top + (heights[ri] - shown.length * BAR_STEP + (BAR_STEP - BAR_H)) / 2;
          return (
            <g key={r.id}>
              <a href={`#/investigations/${r.id}`}>
                <title>{`Open ${r.id}`}</title>
                <text
                  x={LABEL_W - 10} y={mid + 4} textAnchor="end"
                  style={{ fill: "var(--color-link)" }} fontSize="12" fontFamily={MONO}
                >
                  {r.id}
                </text>
              </a>
              {shown.length === 0 ? (
                <text
                  x={LABEL_W + 4} y={mid + 4}
                  style={{ fill: "var(--color-faint)" }} fontSize="11" fontFamily={MONO}
                >
                  NO DATA
                </text>
              ) : (
                shown.map((g, gi) => {
                  const lo = g.min ?? dMin;
                  const hi = g.max ?? dMax;
                  const y = y0 + gi * BAR_STEP;
                  const tip = `${g.label || r.id}: ${fmtRange(g.min, g.max)} ${meta.unit}`;
                  return lo === hi ? (
                    <g key={gi}>
                      <title>{tip}</title>
                      <circle cx={x(lo)} cy={y + BAR_H / 2} r="4" style={{ fill: "var(--color-ink)" }} />
                    </g>
                  ) : (
                    <g key={gi}>
                      <title>{tip}</title>
                      <rect
                        x={x(Math.max(lo, dMin))} y={y}
                        width={Math.max(3, x(Math.min(hi, dMax)) - x(Math.max(lo, dMin)))}
                        height={BAR_H} style={{ fill: "var(--color-ink)" }}
                      />
                    </g>
                  );
                })
              )}
              {r.ranges.length > MAX_BARS && (
                <text
                  x={LABEL_W + 4} y={top + heights[ri] - 2}
                  style={{ fill: "var(--color-faint)" }} fontSize="10" fontFamily={MONO}
                >
                  {`+${r.ranges.length - MAX_BARS} more`}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={W - PAD_R} y={H - 6} textAnchor="end"
          style={{ fill: "var(--color-muted)" }} fontSize="11" fontFamily={MONO}
        >
          {`${meta.label} (${meta.unit}) →`}
        </text>
      </svg>
      <p className="num mt-1 text-xs" style={{ color: "var(--color-faint)" }}>
        {withData} of {rows.length} investigations report {meta.label.toLowerCase()} ranges
        {zone === null && ` · no reference ${meta.label.toLowerCase()} zone for ${zoneLabel}`}
      </p>
    </div>
  );
}
