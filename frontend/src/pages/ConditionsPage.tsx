import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as d3 from "d3";
import { api } from "../api/client";
import type { ConditionsResult } from "../api/types";
import { useApi } from "../hooks/useApi";
import { Empty, ErrorState, Loading } from "../components/StateViews";

const W = 860;
const H = 480;
const M = { top: 16, right: 16, bottom: 44, left: 56 };

/** Oxygen-vs-airflow conditions map with target-atmosphere zones. Missing ranges are gaps, never zeros. */
export default function ConditionsPage() {
  const cond = useApi(() => api<ConditionsResult>("/api/conditions"), []);
  const [zone, setZone] = useState("moon_base");
  const ref = useRef<SVGSVGElement>(null);

  const plotted = useMemo(() => {
    const invs = cond.data?.investigations ?? [];
    const ok: { id: string; label: string; o2: [number, number]; af: [number, number] }[] = [];
    const missing: { id: string; label: string; why: string }[] = [];
    for (const inv of invs) {
      for (const g of inv.groups) {
        const o2 = both(g.oxygen_percent);
        const af = both(g.airflow_cm_s);
        if (o2 && af) ok.push({ id: inv.id, label: g.label || inv.id, o2, af });
        else
          missing.push({
            id: inv.id,
            label: g.label || inv.id,
            why: [!o2 && "oxygen", !af && "airflow"].filter(Boolean).join(" + "),
          });
      }
      if (inv.groups.length === 0) missing.push({ id: inv.id, label: inv.id, why: "no test groups" });
    }
    return { ok, missing };
  }, [cond.data]);

  const activeZone = (cond.data?.zones ?? []).find((z) => z.environment === zone);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    if (plotted.ok.length === 0) return;
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

    const o2max = Math.max(100, d3.max(plotted.ok, (d) => d.o2[1]) ?? 100);
    const afmax = Math.max(d3.max(plotted.ok, (d) => d.af[1]) ?? 10, activeZone?.airflow_cm_s.max ?? 0, 10);
    const x = d3.scaleLinear().domain([0, afmax * 1.05]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, o2max]).range([ih, 0]);

    g.append("g")
      .attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(8).tickSize(-ih))
      .call((a) => {
        a.selectAll("text").style("fill", "var(--color-muted)").attr("font-family", "monospace").attr("font-size", 11);
        a.selectAll("line").style("stroke", "var(--color-gridline)");
        a.selectAll("path").style("stroke", "var(--color-edge)");
      });
    g.append("g")
      .call(d3.axisLeft(y).ticks(8).tickSize(-iw))
      .call((a) => {
        a.selectAll("text").style("fill", "var(--color-muted)").attr("font-family", "monospace").attr("font-size", 11);
        a.selectAll("line").style("stroke", "var(--color-gridline)");
        a.selectAll("path").style("stroke", "var(--color-edge)");
      });
    g.append("text")
      .attr("x", iw / 2)
      .attr("y", ih + 36)
      .attr("text-anchor", "middle")
      .style("fill", "var(--color-muted)")
      .attr("font-family", "monospace")
      .attr("font-size", 11)
      .text("AIRFLOW cm/s →");
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -ih / 2)
      .attr("y", -44)
      .attr("text-anchor", "middle")
      .style("fill", "var(--color-muted)")
      .attr("font-family", "monospace")
      .attr("font-size", 11)
      .text("OXYGEN % →");

    // Target zone (signal outline) when it has both ranges; else an oxygen band.
    if (activeZone) {
      const zo2 = [activeZone.oxygen_percent.min ?? 0, activeZone.oxygen_percent.max ?? 100];
      const zaf0 = activeZone.airflow_cm_s.min;
      const zaf1 = activeZone.airflow_cm_s.max;
      if (zaf0 !== null && zaf1 !== null) {
        g.append("rect")
          .attr("x", x(zaf0))
          .attr("y", y(zo2[1]))
          .attr("width", Math.max(2, x(zaf1) - x(zaf0)))
          .attr("height", Math.max(2, y(zo2[0]) - y(zo2[1])))
          .style("fill", "var(--zone-fill)")
          .style("stroke", "var(--color-signal)")
          .attr("stroke-dasharray", "5 3");
      } else {
        g.append("rect")
          .attr("x", 0)
          .attr("y", y(zo2[1]))
          .attr("width", iw)
          .attr("height", Math.max(2, y(zo2[0]) - y(zo2[1])))
          .style("fill", "var(--zone-fill)")
          .style("stroke", "var(--color-signal)")
          .attr("stroke-dasharray", "5 3");
      }
      g.append("text")
        .attr("x", 6)
        .attr("y", y(zo2[1]) + 14)
        .style("fill", "var(--color-signal)")
        .attr("font-family", "monospace")
        .attr("font-size", 11)
        .text(`TARGET · ${activeZone.label}`);
    }

    // Investigation group rectangles (white hairlines).
    for (const d of plotted.ok) {
      g.append("rect")
        .attr("x", x(d.af[0]))
        .attr("y", y(d.o2[1]))
        .attr("width", Math.max(3, x(d.af[1]) - x(d.af[0])))
        .attr("height", Math.max(3, y(d.o2[0]) - y(d.o2[1])))
        .style("fill", "var(--plot-fill)")
        .style("stroke", "var(--color-ink)")
        .attr("stroke-width", 1)
        .append("title")
        .text(`${d.id} · ${d.label}\nO₂ ${d.o2[0]}–${d.o2[1]}% · airflow ${d.af[0]}–${d.af[1]} cm/s`);
    }
  }, [plotted, activeZone]);

  if (cond.loading) return <Loading label="Loading conditions" />;
  if (cond.error) return <ErrorState error={cond.error} onRetry={cond.retry} />;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Oxygen versus airflow conditions map</h1>
      <div className="panel">
        <div className="panel-head">
          <span className="label">Oxygen vs airflow · target zone</span>
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
        <div className="p-3">
          {plotted.ok.length === 0 ? (
            <Empty message="No test groups have both oxygen and airflow ranges yet." />
          ) : (
            <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Oxygen versus airflow conditions map" />
          )}
        </div>
      </div>
      {plotted.missing.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="label">Not plotted · missing ranges ({plotted.missing.length})</span>
          </div>
          <ul className="space-y-1 p-3 text-sm">
            {plotted.missing.map((m, i) => (
              <li key={i} className="num text-[13px]" style={{ color: "var(--color-muted)" }}>
                <Link to={`/investigations/${m.id}`} className="underline" style={{ color: "var(--color-link)" }}>
                  {m.id}
                </Link>{" "}
                · {m.label} — missing {m.why}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function both(r: { min: number | null; max: number | null; status: string }): [number, number] | null {
  if (r.status === "missing" || r.min === null || r.max === null) return null;
  return [r.min, r.max];
}
