import { ApiError } from "./types";

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error;
    if (e?.code) return new ApiError(e.code, e.message ?? e.code, res.status);
  } catch {
    /* fall through */
  }
  return new ApiError("http_error", `Request failed (${res.status})`, res.status);
}

/** GET JSON from the same-origin /api base path (dev proxy or deployed together). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { Accept: "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("network_error", "API unreachable. Is the backend running?", 0);
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
