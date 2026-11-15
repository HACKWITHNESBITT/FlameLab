import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/types";

/** Fetch-once-per-deps hook with loading/error/retry. Loader errors normalize to ApiError. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    loader().then(
      (d) => {
        if (!live) return;
        setData(d);
        setLoading(false);
      },
      (e: unknown) => {
        if (!live) return;
        setError(e instanceof ApiError ? e : new ApiError("unknown", String(e), 0));
        setLoading(false);
      },
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, retry };
}
