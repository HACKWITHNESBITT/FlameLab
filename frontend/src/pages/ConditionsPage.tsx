import { useMemo, useState } from "react";
import { api } from "../api/client";
import type { ConditionsResult, RangeValue } from "../api/types";
import { useApi } from "../hooks/useApi";
import { ConditionsChart } from "../components/ConditionsChart";
import { QUANTITIES, type ChartRow, type QuantityKey } from "../components/conditionsMeta";
import { ErrorState, Loading } from "../components/StateViews";

const QKEY: Record<QuantityKey, "oxygen_percent" | "pressure_psi" | "airflow_cm_s"> = {
  oxygen: "oxygen_percent",
  pressure: "pressure_psi",
  airflow: "airflow_cm_s",
};

/** Test-conditions chart: per-quantity range strips against the target zone. */
export default function ConditionsPage() {
  const cond = useApi(() => api<ConditionsResult>("/api/conditions"), []);
  const [zone, setZone] = useState("moon_base");
  const [quantity, setQuantity] = useState<QuantityKey>("oxygen");

  const activeZone = (cond.data?.zones ?? []).find((z) => z.environment === zone);
  const rows: ChartRow[] = useMemo(() => {
    const key = QKEY[quantity];
    return (cond.data?.investigations ?? []).map((inv) => ({
      id: inv.id,
      ranges: inv.groups.flatMap((g) => {
        const r = g[key];
        if (r.status === "missing" || (r.min === null && r.max === null)) return [];
        return [{ label: g.label || inv.id, min: r.min, max: r.max }];
      }),
    }));
  }, [cond.data, quantity]);

  if (cond.loading) return <Loading label="Loading conditions" />;
  if (cond.error) return <ErrorState error={cond.error} onRetry={cond.retry} />;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Test conditions chart</h1>
      <div className="panel">
        <div className="panel-head">
          <span className="label">Test ranges · target zone</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Target zone">
            {(cond.data?.zones ?? []).map((z) => (
              <button
                key={z.environment}
                type="button"
                className="btn"
                aria-pressed={zone === z.environment}
                style={zone === z.environment ? { borderColor: "var(--color-signal)", color: "var(--color-signal)" } : undefined}
                onClick={() => setZone(z.environment)}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b p-3" style={{ borderColor: "var(--color-edge)" }}>
          <span className="label mr-1">Quantity</span>
          <div role="group" aria-label="Quantity" className="flex flex-wrap gap-1.5">
            {(Object.keys(QUANTITIES) as QuantityKey[]).map((q) => (
              <button
                key={q}
                type="button"
                className="btn"
                aria-pressed={quantity === q}
                style={quantity === q ? { borderColor: "var(--color-signal)", color: "var(--color-signal)" } : undefined}
                onClick={() => setQuantity(q)}
              >
                {QUANTITIES[q].label} {QUANTITIES[q].unit}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3">
          <ConditionsChart
            rows={rows}
            zone={zoneRange(activeZone?.[QKEY[quantity]])}
            zoneLabel={activeZone?.label ?? zone}
            quantity={quantity}
          />
          <div className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--color-muted)" }}>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-6" style={{ backgroundColor: "var(--color-ink)" }} />
              tested range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--color-ink)" }} />
              single value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-6 border border-dashed" style={{ borderColor: "var(--color-signal)" }} />
              target zone
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function zoneRange(r: RangeValue | undefined): { min: number | null; max: number | null } | null {
  if (!r || (r.min === null && r.max === null)) return null;
  return { min: r.min, max: r.max };
}
