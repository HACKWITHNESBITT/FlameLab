import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiPost } from "./client";
import { ApiError } from "./types";

afterEach(() => vi.unstubAllGlobals());

function mockJson(payload: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status, json: async () => payload }) as unknown as Response),
  );
}

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    mockJson({ a: 1 });
    await expect(api("/api/health")).resolves.toEqual({ a: 1 });
  });

  it("throws ApiError with the contract code on failure", async () => {
    mockJson({ error: { code: "si_unavailable", message: "no key" } }, false, 503);
    const err = await api("/api/ask").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("si_unavailable");
    expect((err as ApiError).status).toBe(503);
  });

  it("throws network_error when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    const err = (await api("/api/health").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("network_error");
    expect(err.status).toBe(0);
  });

  it("posts JSON bodies", async () => {
    const fetch = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response);
    vi.stubGlobal("fetch", fetch);
    await apiPost("/api/ask", { question: "hi" });
    const init = fetch.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ question: "hi" }));
  });
});
