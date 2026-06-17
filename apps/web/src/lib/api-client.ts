import { getAccessToken } from "@/stores/auth-store";

/**
 * Standardized error envelope returned by the API for all handled errors:
 *   { "error": { "code": str, "message": str, "details": {} } }
 */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Typed error thrown for any non-2xx response. Carries the HTTP status plus
 * the parsed envelope fields so callers can branch on `code`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serializable request body. Sent as application/json. */
  body?: unknown;
  /** Override/extend default headers. */
  headers?: HeadersInit;
}

function buildUrl(path: string): string {
  // Allow absolute URLs to pass through untouched; otherwise join to the base.
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function parseEnvelopeError(res: Response): Promise<ApiError> {
  let code = "unknown_error";
  let message = res.statusText || "Request failed";
  let details: Record<string, unknown> = {};

  try {
    const data = (await res.json()) as Partial<ApiErrorEnvelope>;
    if (data && typeof data === "object" && data.error) {
      code = data.error.code ?? code;
      message = data.error.message ?? message;
      details = data.error.details ?? {};
    }
  } catch {
    // Body was not JSON / empty — fall back to status text.
  }

  return new ApiError(res.status, code, message, details);
}

/**
 * Typed JSON fetch wrapper.
 *
 * - Prefixes paths with NEXT_PUBLIC_API_BASE_URL.
 * - Serializes `body` as JSON and sets the Content-Type header.
 * - Injects a bearer token from the auth store when present.
 * - Throws `ApiError` (parsed from the {error:{...}} envelope) on non-2xx.
 *
 * @typeParam T - expected JSON response shape.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");

  // Placeholder bearer-token injection (real auth flow lands in a later phase).
  const token = getAccessToken();
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    serializedBody = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: serializedBody,
    // Skeleton talks to a same-site API; adjust credentials when cookies land.
    cache: rest.cache ?? "no-store",
  });

  if (!res.ok) {
    throw await parseEnvelopeError(res);
  }

  // 204 No Content (and other empty bodies) -> resolve as undefined.
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** Shape of the GET /health response (shared contract). */
export interface HealthResponse {
  status: "ok";
  db: "ok" | "down";
  redis: "ok" | "down";
  env: string;
}

/** Convenience helper for the health probe used on the home page. */
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}
