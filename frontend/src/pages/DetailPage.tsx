import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Environment, FlamelabRecord, SiSummary } from "../api/types";
import { isWrapped } from "../api/types";
import { useApi } from "../hooks/useApi";
import { FieldValue } from "../components/FieldValue";
import { SiBlock } from "../components/SiBlock";
import { Empty, ErrorState, Loading, Notice } from "../components/StateViews";

/** Journey 2: investigation detail → verified SI summary → conditions and measurements. */
export default function DetailPage() {
  const { id = "" } = useParams();
  const rec = useApi(() => api<FlamelabRecord>(`/api/investigations/${encodeURIComponent(id)}`), [id]);

  if (rec.loading) return <Loading label="Loading investigation" />;
  if (rec.error) return <ErrorState error={rec.error} onRetry={rec.retry} />;
  if (!rec.data) return <Empty message="Record not found." />;
  const r = rec.data;

  return (
    <div className="space-y-4">
      <div className="panel p-4">
        <p className="label">
          {r.id} · {str(r.psi_id) || "psi TBD"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{str(r.name) || r.id}</h1>
        {str(r.acronym_expansion) && <p style={{ color: "var(--color-muted)" }}>{str(r.acronym_expansion)}</p>}
        <div className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--color-muted)" }}>
          {str(r.project) && <span>project: {str(r.project)}</span>}
          {str(r.platform) && <span>platform: {str(r.platform)}</span>}
          {str(r.doi_citation) && <span>doi: {str(r.doi_citation)}</span>}
          {str(r.psi_url) && (
            <a className="underline" style={{ color: "var(--color-link)" }} href={str(r.psi_url)} target="_blank" rel="noreferrer">
              PSI record
            </a>
          )}
        </div>
        {Array.isArray(r.related) && r.related.length > 0 && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
            Related:{" "}
            {r.related.map((rel, i) => (
              <span key={String(rel)}>
                {i > 0 && " · "}
                <Link to={`/investigations/${rel}`} className="underline" style={{ color: "var(--color-link)" }}>
                  {String(rel)}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>

      <SiSummaryPanel id={r.id} />

      <section aria-label="Record fields" className="panel px-4 py-2">
        <dl className="divide-y" style={{ borderColor: "var(--color-edge)" }}>
          {["hardware", "hardware_detail", "investigation_type", "gravity_regime", "safety_pillars", "fuel_class", "objectives", "summary", "relevance_tags"].map(
            (k) => r[k] !== undefined && <FieldValue key={k} label={k} field={r[k]} />,
          )}
        </dl>
      </section>

      <FuelsTable value={r.fuels} />
      <ConditionsTable value={r.test_conditions} />
      <VariablesBlock value={r.variables} />
      <MeasurementsTable value={r.measurements} />

      <section aria-label="Data quality" className="panel px-4 py-2">
        <FieldValue label="data_quality" field={r.data_quality} />
        {r.earth_applications !== undefined && <FieldValue label="earth_applications" field={r.earth_applications} />}
      </section>

      <p className="text-[13px]">
        <Link to="/conditions" className="underline" style={{ color: "var(--color-link)" }}>
          Open the test conditions chart →
        </Link>
      </p>
    </div>
  );
}

function SiSummaryPanel({ id }: { id: string }) {
  const [env, setEnv] = useState("moon_base");
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  const si = useApi(() => api<SiSummary>(`/api/si/summary/${encodeURIComponent(id)}?environment=${env}`), [id, env]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">SI summary for</span>
        <select aria-label="Summary environment" className="input" value={env} onChange={(e) => setEnv(e.target.value)}>
          {(envs.data ?? [{ id: "moon_base", label: "Moon base" } as Environment]).map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      {si.loading && <Loading label="Generating verified summary" />}
      {si.error && <ErrorState error={si.error} onRetry={si.retry} />}
      {si.data && (
        <>
          <SiBlock title="Findings" items={si.data.findings} passed={si.data.verification.passed} />
          {si.data.interpretation.length > 0 && (
            <SiBlock
              title="Interpretation (model inference, cited)"
              items={si.data.interpretation}
              gaps={si.data.gaps}
              passed={si.data.verification.passed}
            />
          )}
          {si.data.interpretation.length === 0 && si.data.gaps.length > 0 && (
            <Notice>
              Limits &amp; gaps: {si.data.gaps.join(" ")}
            </Notice>
          )}
        </>
      )}
    </div>
  );
}

function FuelsTable({ value }: { value: unknown }) {
  const rows = isWrapped(value) && Array.isArray(value.value) ? (value.value as Record<string, unknown>[]) : null;
  if (!rows || rows.length === 0) return null;
  return (
    <section aria-label="Fuels" className="panel">
      <div className="panel-head"><span className="label">Fuels</span></div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left">
              {["name", "phase", "shape", "size", "notes"].map((h) => (
                <th key={h} scope="col" className="pr-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f, i) => (
              <tr key={i} className="border-t align-top" style={{ borderColor: "var(--color-edge)" }}>
                <td className="py-1 pr-3">{str(f.name) || "—"}</td>
                <td className="num py-1 pr-3">{str(f.phase) || "—"}</td>
                <td className="py-1 pr-3">{str(f.shape) || "—"}</td>
                <td className="num py-1 pr-3">{str(f.size) || "—"}</td>
                <td className="py-1 text-[13px]" style={{ color: "var(--color-muted)" }}>{str(f.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConditionsTable({ value }: { value: unknown }) {
  const rows = isWrapped(value) && Array.isArray(value.value) ? (value.value as Record<string, unknown>[]) : null;
  if (!rows || rows.length === 0) return null;
  const cols = ["label", "oxygen_percent", "diluent", "pressure_psi", "airflow_cm_s", "ignition_method", "gravity_level"];
  return (
    <section aria-label="Test conditions" className="panel">
      <div className="panel-head"><span className="label">Test conditions</span></div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left">
              {cols.map((h) => (
                <th key={h} scope="col" className="pr-3 font-normal">{h.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {rows.map((g, i) => (
              <tr key={i} className="border-t align-top" style={{ borderColor: "var(--color-edge)" }}>
                {cols.map((c) => (
                  <td key={c} className="py-1 pr-3">
                    {cell(g[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VariablesBlock({ value }: { value: unknown }) {
  const v = isWrapped(value) && value.value && typeof value.value === "object" ? (value.value as Record<string, unknown>) : null;
  if (!v) return null;
  const varied = Array.isArray(v.varied) ? v.varied.map(String) : [];
  const held = Array.isArray(v.held_constant) ? v.held_constant.map(String) : [];
  if (varied.length === 0 && held.length === 0) return null;
  return (
    <section aria-label="Variables" className="panel grid gap-3 p-3 sm:grid-cols-2">
      <div>
        <p className="label mb-1">Varied</p>
        <ul className="list-disc pl-5 text-sm">{varied.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <div>
        <p className="label mb-1">Held constant</p>
        <ul className="list-disc pl-5 text-sm">{held.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    </section>
  );
}

function MeasurementsTable({ value }: { value: unknown }) {
  const rows = isWrapped(value) && Array.isArray(value.value) ? (value.value as Record<string, unknown>[]) : null;
  if (!rows || rows.length === 0) return null;
  return (
    <section aria-label="Measurements" className="panel">
      <div className="panel-head"><span className="label">Measurements</span></div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left">
              {["sensor", "quantity", "notes"].map((h) => (
                <th key={h} scope="col" className="pr-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i} className="border-t align-top" style={{ borderColor: "var(--color-edge)" }}>
                <td className="py-1 pr-3">{str(m.sensor) || "—"}</td>
                <td className="py-1 pr-3">{str(m.quantity) || "—"}</td>
                <td className="py-1 text-[13px]" style={{ color: "var(--color-muted)" }}>{str(m.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function cell(v: unknown): string {
  if (!isWrapped(v)) return typeof v === "string" ? v : "—";
  if (v.status === "missing" || v.value === null) return "—";
  const val = v.value as Record<string, unknown> | string | number;
  if (typeof val === "object" && val !== null && ("min" in val || "max" in val)) {
    const lo = val.min as number | null;
    const hi = val.max as number | null;
    if (lo === null && hi === null) return "—";
    if (lo !== null && hi !== null) return lo === hi ? String(lo) : `${lo}–${hi}`;
    return lo !== null ? `≥${lo}` : `≤${hi}`;
  }
  return String(val);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

