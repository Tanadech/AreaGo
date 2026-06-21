/**
 * Centralized React Query key factory.
 *
 * Keeping every query key in one place avoids typos and makes targeted
 * invalidation (`queryClient.invalidateQueries({ queryKey: queryKeys.X })`)
 * predictable across the app. Each entry returns a readonly tuple.
 */
export const queryKeys = {
  health: () => ["health"] as const,

  auth: {
    all: () => ["auth"] as const,
    me: () => [...queryKeys.auth.all(), "me"] as const,
  },

  places: {
    all: () => ["places"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.places.all(), "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.places.all(), "detail", id] as const,
  },

  trips: {
    all: () => ["trips"] as const,
    list: () => [...queryKeys.trips.all(), "list"] as const,
    detail: (id: string) => [...queryKeys.trips.all(), "detail", id] as const,
  },

  // Example domain placeholders — expand per feature in later phases.
  areas: {
    all: () => ["areas"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.areas.all(), "list", params ?? {}] as const,
    detail: (id: string) => [...queryKeys.areas.all(), "detail", id] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
