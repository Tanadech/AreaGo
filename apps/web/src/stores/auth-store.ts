import { create } from "zustand";

/**
 * Minimal authenticated user shape. Expand as the auth domain grows
 * (kept intentionally small for the P1 skeleton).
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** Store a freshly issued access token + user after login/refresh. */
  setAuth: (payload: { accessToken: string; user: AuthUser }) => void;
  /** Wipe all auth state (logout / 401). */
  clear: () => void;
}

/**
 * Client-side auth store. The api-client reads `accessToken` from here to
 * inject the bearer token on outgoing requests.
 *
 * NOTE: token is held in memory only for the skeleton. Persistence
 * (e.g. httpOnly refresh cookie + silent refresh) is a later phase.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: ({ accessToken, user }) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
}));

/**
 * Non-hook accessor for use outside React (e.g. the api-client fetch wrapper).
 * Returns the current access token or null.
 */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
