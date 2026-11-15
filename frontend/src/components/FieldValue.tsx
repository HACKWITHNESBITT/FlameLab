import { isWrapped, type Wrapped } from "../api/types";

function plain(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join("; ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("min" in o || "max" in o) {
      const lo = o.min ?? "−∞";
      const hi = o.max ?? "+∞";
      return lo === hi ? String(lo) : `${lo} – ${hi}`;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

const STATUS_LABEL: Record<string, string> = {
  read: "read",
  inferred: "inferred",
  missing: "missing",
  ambiguous: "ambiguous",
};

/** Renders one wrapped schema field: value + unit + status + source + note. */
export function FieldValue({ label, field }: { label: string; field: unknown }) {
  if (!isWrapped(field)) {
    return (
      <div className="py-1.5">
        <dt className="label">{label}</dt>
        <dd className="text-sm">{plain(field)}</dd>
      </div>
    );
  }
  const w = field as Wrapped;
  const missing = w.status === "missing" || w.value === null;
  const src = w.source as Record<string, unknown> | undefined;
  return (
    <div className="py-1.5">
      <dt className="label">
        {label}{" "}
        <span
          className="num ml-1 rounded-sm border px-1"
          style={{
            borderColor: "var(--color-edge)",
            color: missing ? "var(--color-faint)" : w.status === "read" ? "var(--color-ok)" : "var(--color-signal)",
          }}
        >
          {STATUS_LABEL[w.status] ?? w.status}
        </span>
      </dt>
      <dd className="text-sm">
        {missing ? <span style={{ color: "var(--color-faint)" }}>—</span> : plain(w.value)}
        {w.unit && !missing && <span className="num ml-1" style={{ color: "var(--color-muted)" }}>{w.unit}</span>}
      </dd>
      {w.note && <dd className="text-[13px]" style={{ color: "var(--color-muted)" }}>Note: {w.note}</dd>}
      {src && (
        <dd className="num text-xs" style={{ color: "var(--color-faint)" }}>
          src: {[src.doc, src.section].filter(Boolean).join(" · ") || "record"}
        </dd>
      )}
    </div>
  );
}
