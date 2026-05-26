const DEFAULT_TIMEOUT_MS = 15_000;

/** Bound fetch duration so hung Supabase/auth calls fail fast instead of ~60s+. */
export function fetchWithTimeout(timeoutMs = DEFAULT_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = init?.signal;
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}
