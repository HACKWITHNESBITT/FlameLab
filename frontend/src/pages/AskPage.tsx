import { useState } from "react";
import { api, apiPost } from "../api/client";
import type { AskResult, Environment } from "../api/types";
import { ApiError } from "../api/types";
import { useApi } from "../hooks/useApi";
import { SiText } from "../components/Citations";
import { ErrorState, Loading, Notice } from "../components/StateViews";

const EXAMPLES = [
  "Which investigations tested solid fuels in microgravity?",
  "What did Saffire-I test and what did it find?",
  "How does flame behavior change at Mars gravity?",
];

/** Grounded Q&A: cited answers or an explicit not-covered response. Never procedures. */
export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [env, setEnv] = useState("moon_base");
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);
  const [state, setState] = useState<{ loading: boolean; data: AskResult | null; error: ApiError | null }>({
    loading: false,
    data: null,
    error: null,
  });

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || state.loading) return;
    setState({ loading: true, data: null, error: null });
    apiPost<AskResult>("/api/ask", { question: trimmed, environment: env }).then(
      (data) => setState({ loading: false, data, error: null }),
      (error: ApiError) => setState({ loading: false, data: null, error }),
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Ask the research data</h1>
      <form
        className="panel space-y-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label className="block text-sm">
          <span className="label">Ask about the research data</span>
          <textarea
            aria-label="Question"
            className="input mt-1 min-h-20"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which investigations tested solid fuels in microgravity?"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Environment context" className="input" value={env} onChange={(e) => setEnv(e.target.value)}>
            {(envs.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={state.loading || !question.trim()}>
            {state.loading ? "Asking…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="btn"
              onClick={() => {
                setQuestion(ex);
                ask(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>
      {state.loading && <Loading label="Retrieving and verifying" />}
      {state.error && <ErrorState error={state.error} />}
      {state.data && <Answer result={state.data} />}
      <Notice>
        FlameLab answers from curated records only. It cannot give crew fire-response procedures — for those,
        consult mission safety authorities. Rocket and propellant fires are out of scope.
      </Notice>
    </div>
  );
}

function Answer({ result }: { result: AskResult }) {
  if (!result.covered) {
    return (
      <div className="panel p-4">
        <p className="label" style={{ color: "var(--color-warn)" }}>Not covered by the available data</p>
        <p className="mt-1 text-sm">{result.answer}</p>
        {result.missing.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-[13px]" style={{ color: "var(--color-muted)" }}>
            {result.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="label">Answer</span>
        <span className="num text-xs" style={{ color: result.verification.passed ? "var(--color-ok)" : "var(--color-warn)" }}>
          {result.verification.passed ? "● verified" : "▲ partially verified"}
        </span>
      </div>
      <p className="p-3 text-sm leading-relaxed">
        <SiText text={result.answer} citations={result.citations} />
      </p>
    </div>
  );
}
