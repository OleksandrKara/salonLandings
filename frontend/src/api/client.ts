const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// A slow/unresponsive backend call (e.g. one waiting on an upstream Square API that's hanging)
// used to leave a plain fetch() simply never resolving — useAsync's status stayed "loading"
// forever with no way out short of a full page reload (see DateTimeStep's "Loading available
// times…"). Every request now gets a hard upper bound so it fails visibly instead.
const REQUEST_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function requestOnce<T>(path: string, init: RequestInit, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal,
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text().catch(() => undefined);
    }
    const message =
      (typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : undefined) ?? `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(message, response.status, detail);
  }

  return (await response.json()) as T;
}

/** retries only makes sense for a read: safe to repeat blindly, unlike a write that could have
 * partially succeeded server-side even if the client's own connection timed out waiting for the
 * response (e.g. a booking that was actually created) — retrying that blindly risks a duplicate,
 * so writes (apiPost) get the same timeout protection but no automatic retry. */
async function request<T>(path: string, init?: RequestInit, retries = 0): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await requestOnce<T>(path, init ?? {}, controller.signal);
    } catch (err) {
      lastError = err;
      // Our own bad request (4xx) won't succeed on retry either — only a timeout/network
      // failure or a 5xx (transient/upstream) is worth trying again.
      if (err instanceof ApiError && err.status < 500) throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" }, 2);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}
