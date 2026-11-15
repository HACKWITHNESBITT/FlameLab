import { useEffect, useRef, useState } from "react";
import botUrl from "../assets/bot.jpeg";
import { api, apiPost } from "../api/client";
import type { AskResult, Environment } from "../api/types";
import { ApiError } from "../api/types";
import { useApi } from "../hooks/useApi";
import { SiText } from "./Citations";

const STORE_KEY = "flamelab-ask-history";
const MAX_STORED = 30;

const EXAMPLES = [
  "Which investigations tested solid fuels in microgravity?",
  "What did Saffire-I test and what did it find?",
  "How does flame behavior change at Mars gravity?",
];

interface StoredError {
  code: string;
  message: string;
}

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  ts: number;
  env: string;
  question: string;
  result: AskResult | null;
  error: StoredError | null;
}

function loadHistory(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMsg[];
    return Array.isArray(parsed) ? parsed.filter((m) => m && m.question).slice(-MAX_STORED) : [];
  } catch {
    return [];
  }
}

/** Floating Ask chat: the full /api/ask flow as a bottom-right widget on every page. */
export function AskWidget() {
  const [open, setOpen] = useState(false);
  const [everOpen, setEverOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed right-5 bottom-5 z-50 flex h-[60px] w-[60px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 hover:brightness-110"
        style={{ borderColor: "var(--color-signal)", backgroundColor: "var(--color-panel)", color: "var(--color-signal)" }}
        aria-expanded={open}
        aria-controls="ask-chat"
        aria-label={open ? "Close ask chat" : "Open ask chat"}
        title={open ? "Close ask chat" : "Open ask chat"}
        onClick={() => {
          setEverOpen(true);
          setOpen((o) => !o);
        }}
      >
        {open ? <CloseIcon /> : <img src={botUrl} alt="" aria-hidden="true" className="h-full w-full scale-110 object-cover" />}
      </button>
      {everOpen && (
        <div className={open ? "contents" : "hidden"}>
          <AskPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

function AskPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>(loadHistory);
  const [input, setInput] = useState("");
  const [env, setEnv] = useState("moon_base");
  const [pending, setPending] = useState<{ q: string; ts: number } | null>(null);
  const idRef = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const envs = useApi(() => api<Environment[]>("/api/environments"), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      /* history stays in memory when storage is unavailable */
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || pending) return;
    const id = idRef.current++;
    setMessages((ms) => [...ms, { id, role: "user", ts: Date.now(), env, question: q, result: null, error: null }]);
    setInput("");
    setPending({ q, ts: Date.now() });
    apiPost<AskResult>("/api/ask", { question: q, environment: env }).then(
      (result) => {
        setPending(null);
        setMessages((ms) => [
          ...ms,
          { id: idRef.current++, role: "assistant", ts: Date.now(), env, question: q, result, error: null },
        ]);
      },
      (e: unknown) => {
        const err = e instanceof ApiError ? e : new ApiError("unknown", String(e), 0);
        setPending(null);
        setMessages((ms) => [
          ...ms,
          {
            id: idRef.current++, role: "assistant", ts: Date.now(), env, question: q,
            result: null, error: { code: err.code, message: err.message },
          },
        ]);
      },
    );
  };

  return (
    <section
      id="ask-chat"
      role="dialog"
      aria-label="Ask the research data"
      className="panel fixed right-5 bottom-20 z-50 flex flex-col"
      style={{ width: "min(400px, calc(100vw - 2.5rem))", height: "min(560px, calc(100vh - 9rem))" }}
    >
      <div className="panel-head">
        <span className="label">Ask the data</span>
        <div className="flex items-center gap-2">
          <select
            aria-label="Environment context"
            className="input"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }}
            value={env}
            onChange={(e) => setEnv(e.target.value)}
          >
            {(envs.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
          <button type="button" className="btn" aria-label="Close ask chat" onClick={onClose}>
            ×
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-3" aria-live="polite">
        {messages.length === 0 && !pending && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Cited answers from the curated records — or an explicit not-covered response. Never procedures.
            </p>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="btn block w-full text-left" onClick={() => send(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} msg={m} onRetry={() => send(m.question)} />
        ))}
        {pending && (
          <div className="space-y-1">
            <p className="num text-xs" style={{ color: "var(--color-faint)" }}>
              {timeOf(pending.ts)} · {env}
            </p>
            <p className="label num animate-pulse">Retrieving and verifying …</p>
          </div>
        )}
      </div>

      <form
        className="space-y-2 border-t p-3"
        style={{ borderColor: "var(--color-edge)" }}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          aria-label="Chat input"
          className="input min-h-14"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about the research… (Enter to send)"
        />
        <div className="flex items-center gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={!input.trim() || !!pending}>
            {pending ? "Asking…" : "Send"}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMessages([]);
                try {
                  localStorage.removeItem(STORE_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function Message({ msg, onRetry }: { msg: ChatMsg; onRetry: () => void }) {
  if (msg.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-raised)", border: "1px solid var(--color-edge)", borderRadius: "3px" }}>
        {msg.question}
        <p className="num mt-1 text-right text-[11px]" style={{ color: "var(--color-faint)" }}>
          {timeOf(msg.ts)} · {msg.env}
        </p>
      </div>
    );
  }
  if (msg.error) {
    return (
      <div className="space-y-1">
        <p className="num text-xs" style={{ color: "var(--color-faint)" }}>
          {timeOf(msg.ts)} · {msg.env}
        </p>
        <p role="alert" className="text-sm">
          <span className="num" style={{ color: "var(--color-alarm)" }}>{msg.error.code}</span>
          {" — "}{msg.error.message}
        </p>
        <button type="button" className="btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  const r = msg.result!;
  if (!r.covered) {
    return (
      <div className="space-y-1">
        <p className="num text-xs" style={{ color: "var(--color-faint)" }}>
          {timeOf(msg.ts)} · {msg.env}
        </p>
        <p className="label" style={{ color: "var(--color-warn)" }}>Not covered by the available data</p>
        <p className="text-sm">{r.answer}</p>
        {r.missing.length > 0 && (
          <ul className="list-disc pl-5 text-[13px]" style={{ color: "var(--color-muted)" }}>
            {r.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="num text-xs" style={{ color: "var(--color-faint)" }}>
        {timeOf(msg.ts)} · {msg.env} ·{" "}
        <span style={{ color: r.verification.passed ? "var(--color-ok)" : "var(--color-warn)" }}>
          {r.verification.passed ? "● verified" : "▲ partially verified"}
        </span>
      </p>
      <p className="text-sm leading-relaxed">
        <SiText text={r.answer} citations={r.citations} />
      </p>
    </div>
  );
}

function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
