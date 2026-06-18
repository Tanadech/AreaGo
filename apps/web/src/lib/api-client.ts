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

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /auth/login -> access token (refresh is set as an httpOnly cookie). */
export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

/** GET /auth/me -> the authenticated user profile + roles. */
export interface MeResponse {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string[];
}

/**
 * POST /api/v1/auth/login.
 *
 * `credentials: "include"` so the server can set the httpOnly refresh cookie
 * (and send it on a same-site refresh later).
 */
export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body,
    credentials: "include",
  });
}

/** GET /api/v1/auth/me (Bearer token injected by the fetch wrapper). */
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

/* -------------------------------------------------------------------------- */
/* Places                                                                     */
/* -------------------------------------------------------------------------- */

/** A place as returned by the catalog/list endpoints. */
export interface Place {
  id: string;
  name: string;
  kind?: string | null;
  category_id?: string | null;
  category?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  price_level?: number | null;
  lat: number;
  lng: number;
  distance_m?: number | null;
  address?: string | null;
  google_place_id?: string | null;
}

/** Generic paginated envelope used by list endpoints. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** Optional filters accepted by GET /api/v1/places. */
export interface ListPlacesParams {
  category_id?: string;
  kind?: string;
  q?: string;
  sort?: "rating" | "popular" | "name";
  page?: number;
  size?: number;
}

/** GET /api/v1/places -> a page of places (public read). */
export function listPlaces(params: ListPlacesParams = {}): Promise<Page<Place>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return apiFetch<Page<Place>>(`/places${qs ? `?${qs}` : ""}`);
}

/** Body for creating a place (POST /api/v1/places). Bearer required. */
export interface SavePlaceRequest {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  google_place_id?: string;
  category_id?: string;
  phone?: string;
  website?: string;
  kind?: string;
}

/**
 * POST /api/v1/places.
 *
 * Requires authentication; throws an {@link ApiError} with `status === 401`
 * when no/expired token is present so callers can trigger the login flow and
 * retry.
 */
export function savePlace(body: SavePlaceRequest): Promise<Place> {
  return apiFetch<Place>("/places", { method: "POST", body });
}
