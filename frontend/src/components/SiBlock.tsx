import type { SiItem } from "../api/types";
import { SiText } from "./Citations";
import { Notice } from "./StateViews";

/** Verified SI block: findings/interpretation with citations, gaps, verification state. */
export function SiBlock({
  title,
  items,
  gaps,
  passed,
}: {
  title: string;
  items: SiItem[];
  gaps?: string[];
  passed: boolean;
}) {
  return (
    <section aria-label={title} className="panel">
      <div className="panel-head">
        <span className="label">{title}</span>
        <span
          className="num text-xs"
          style={{ color: passed ? "var(--color-ok)" : "var(--color-warn)" }}
        >
          {passed ? "● verified" : "▲ partially verified"}
        </span>
      </div>
      <div className="space-y-3 p-3">
        {items.length === 0 && (
          <Notice tone="warn">No verified statements could be produced from the available data.</Notice>
        )}
        {items.map((it, i) => (
          <p key={i} className="text-sm leading-relaxed">
            <SiText text={it.text} citations={it.citations} />
          </p>
        ))}
        {!passed && items.length > 0 && (
          <Notice tone="warn">Some statements failed citation verification and were removed.</Notice>
        )}
        {gaps && gaps.length > 0 && (
          <div className="border-t pt-2" style={{ borderColor: "var(--color-edge)" }}>
            <p className="label mb-1">Limits &amp; gaps</p>
            <ul className="list-disc space-y-1 pl-5 text-[13px]" style={{ color: "var(--color-muted)" }}>
              {gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
