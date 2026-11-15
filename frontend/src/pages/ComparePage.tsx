import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, apiPost } from "../api/client";
import type { CompareResult, Environment, ExportCsv, ExportJson, RankEntry, SiCompare } from "../api/types";
import { ApiError } from "../api/types";
import { useApi } from "../hooks/useApi";
import { FactorRadar } from "../components/FactorRadar";
import { SiBlock } from "../components/SiBlock";
import { Empty, ErrorState, Loading } from "../components/StateViews";

/** Journey 3b: compare 2–3 investigations field-by-field, with SI commentary and export. */
export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get("ids") ?? "bass-ii,saffire-i");
  const idsParam = params.get("ids") ?? "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = ids.length >= 2 && ids.length <= 3 && new Set(ids).size === ids.length;

  const cmp = useApi(
    () => (valid ? api<CompareResult>(`/api/compare?ids=${encodeURIComponent(ids.join(","))}`) : Promise.resolve(null)),
    [idsParam],
  );
  const [env, setEnv] = useState("moon_base");
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Compare investigations</h1>
      <form
        className="panel flex flex-wrap items-end gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ ids: draft.trim() });
        }}
      >
        <label className="min-w-64 flex-1 text-sm">
          <span className="label">Investigation ids (2–3, comma separated)</span>
          <input aria-label="Investigation ids" className="input num mt-1" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary">
          Compare
        </button>
      </form>
      {!valid ? (
        <Empty message="Enter two or three distinct investigation ids to compare." />
      ) : cmp.loading ? (
        <Loading label="Comparing" />
      ) : cmp.error ? (
        <ErrorState error={cmp.error} onRetry={cmp.retry} />
      ) : cmp.data ? (
        <>
          <AlignedTable data={cmp.data} />
          <DiffList title="Similarities" rows={cmp.data.similarities} />
          <DiffList title="Differences" rows={cmp.data.differences} />
          <FactorRadarPanel ids={ids} env={env} onEnv={setEnv} envs={envs.data ?? []} />
          <SiComparePanel ids={ids} env={env} onEnv={setEnv} envs={envs.data ?? []} />
          <ExportPanel ids={ids} />
        </>
      ) : null}
    </div>
  );
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.map(String).join(", ") || "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AlignedTable({ data }: { data: CompareResult }) {
  const fields = Object.keys(data.aligned[data.ids[0]] ?? {});
  return (
    <section aria-label="Aligned fields" className="panel">
      <div className="panel-head"><span className="label">Aligned fields</span></div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="label text-left">
              <th scope="col" className="pr-3 font-normal">Field</th>
              {data.ids.map((id) => (
                <th key={id} scope="col" className="pr-3 font-normal">
                  <Link to={`/investigations/${id}`} className="num underline" style={{ color: "var(--color-link)" }}>
                    {id}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f} className="border-t align-top" style={{ borderColor: "var(--color-edge)" }}>
                <th scope="row" className="num py-1 pr-3 text-left font-normal">{f.replace(/_/g, " ")}</th>
                {data.ids.map((id) => (
                  <td key={id} className="py-1 pr-3">{fmt(data.aligned[id]?.[f])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiffList({ title, rows }: { title: string; rows: { field: string; values: Record<string, unknown> }[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={title} className="panel">
      <div className="panel-head"><span className="label">{title}</span></div>
      <ul className="space-y-1 p-3 text-sm">
        {rows.map((r) => (
          <li key={r.field}>
            <span className="num">{r.field.replace(/_/g, " ")}</span>
            <span style={{ color: "var(--color-muted)" }}>
              {" — "}
              {Object.entries(r.values).map(([id, v]) => `${id}: ${fmt(v)}`).join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FactorRadarPanel({ ids, env, onEnv, envs }: EnvProps & { ids: string[] }) {
  const rank = useApi(
    () => api<RankEntry[]>(`/api/rank?environment=${encodeURIComponent(env)}&lens=all`),
    [env],
  );
  const list = envs.length > 0 ? envs : [{ id: "moon_base", label: "Moon base" } as Environment];
  return (
    <section aria-label="Factor radar" className="panel">
      <div className="panel-head">
        <span className="label">Factor radar</span>
        <label className="flex items-center gap-2 text-sm">
          <span className="label">Environment</span>
          <select aria-label="Radar environment" className="input" value={env} onChange={(e) => onEnv(e.target.value)}>
            {list.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="p-1">
        {rank.loading && <Loading label="Loading factor scores" />}
        {rank.error && <ErrorState error={rank.error} onRetry={rank.retry} />}
        {rank.data && <FactorRadar ids={ids} entries={rank.data.filter((r) => ids.includes(r.id))} />}
      </div>
    </section>
  );
}

interface EnvProps {
  env: string;
  onEnv: (id: string) => void;
  envs: Environment[];
}

function SiComparePanel({ ids, env, onEnv, envs }: EnvProps & { ids: string[] }) {
  const [state, setState] = useState<{ loading: boolean; data: SiCompare | null; error: ApiError | null }>({
    loading: false,
    data: null,
    error: null,
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">SI commentary for</span>
        <select aria-label="Compare environment" className="input" value={env} onChange={(e) => onEnv(e.target.value)}>
          {(envs.length > 0 ? envs : [{ id: "moon_base", label: "Moon base" } as Environment]).map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={state.loading}
          onClick={() => {
            setState({ loading: true, data: null, error: null });
            apiPost<SiCompare>("/api/si/compare", { ids, environment: env }).then(
              (data) => setState({ loading: false, data, error: null }),
              (error: ApiError) => setState({ loading: false, data: null, error }),
            );
          }}
        >
          {state.loading ? "Generating…" : "Generate SI comparison"}
        </button>
      </div>
      {state.error && <ErrorState error={state.error} />}
      {state.data && (
        <>
          <SiBlock title="Similarities (SI, cited)" items={state.data.similarities} passed={state.data.verification.passed} />
          <SiBlock title="Differences (SI, cited)" items={state.data.differences} passed={state.data.verification.passed} />
        </>
      )}
    </div>
  );
}

function ExportPanel({ ids }: { ids: string[] }) {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [fields, setFields] = useState("id,name,hardware,fuel_class");
  const exp = useApi<ExportJson | ExportCsv>(
    () =>
      format === "json"
        ? api<ExportJson>(`/api/export?ids=${ids.join(",")}&format=json&fields=${encodeURIComponent(fields)}`)
        : api<ExportCsv>(`/api/export?ids=${ids.join(",")}&format=csv`),
    [ids.join(","), format, fields],
  );

  const download = () => {
    if (!exp.data) return;
    const text = format === "csv" ? (exp.data as ExportCsv).csv : JSON.stringify(exp.data, null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `flamelab-${ids.join("-")}.${format === "csv" ? "csv" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Export" className="panel">
      <div className="panel-head">
        <span className="label">Export for modeling</span>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Format" className="flex gap-1.5">
            {(["json", "csv"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className="btn"
                aria-pressed={format === f}
                style={format === f ? { borderColor: "var(--color-signal)", color: "var(--color-signal)" } : undefined}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="btn" disabled={!exp.data} onClick={download}>
            Download
          </button>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {format === "json" && (
          <label className="block text-sm">
            <span className="label">Fields (comma separated)</span>
            <input aria-label="Export fields" className="input num mt-1" value={fields} onChange={(e) => setFields(e.target.value)} />
          </label>
        )}
        {exp.loading && <Loading label="Preparing export" />}
        {exp.error && <ErrorState error={exp.error} onRetry={exp.retry} />}
        {exp.data && format === "json" && <JsonPreview data={exp.data as ExportJson} />}
        {exp.data && format === "csv" && (
          <pre className="num overflow-x-auto text-xs" style={{ color: "var(--color-muted)" }}>
            {(exp.data as ExportCsv).csv.split("\n").slice(0, 12).join("\n")}
            {(exp.data as ExportCsv).csv.split("\n").length > 12 ? "\n…" : ""}
          </pre>
        )}
      </div>
    </section>
  );
}

function JsonPreview({ data }: { data: ExportJson }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="label text-left">
            {data.fields.map((f) => (
              <th key={f} scope="col" className="pr-3 font-normal">{f}</th>
            ))}
          </tr>
        </thead>
        <tbody className="num">
          {data.rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: "var(--color-edge)" }}>
              {data.fields.map((f) => (
                <td key={f} className="py-1 pr-3">{fmt(r[f])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
