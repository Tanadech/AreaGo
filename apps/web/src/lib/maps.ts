import { Loader } from "@googlemaps/js-api-loader";

/**
 * Google Maps JS API singleton loader.
 *
 * Reads the browser-side key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (inlined at
 * build time). We deliberately use the modern `importLibrary` flow (not the
 * deprecated `Loader.load()` global) so that:
 *   - only the libraries we ask for are fetched, and
 *   - we get the *current* Places API (`google.maps.places.Place`,
 *     `PlaceAutocompleteElement`) which is required for keys created after
 *     March 2025 (the legacy `Autocomplete`/`PlacesService` widgets are
 *     disabled on new "Places API (New)"-only keys).
 *
 * Everything here is browser-only; callers must run it inside a client
 * component / effect (the Loader touches `document`).
 */

/** The browser-side Maps key, or an empty string when unset. */
export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** True when a Maps key is configured. Guard UI on this before loading. */
export function hasMapsApiKey(): boolean {
  return MAPS_API_KEY.trim().length > 0;
}

/**
 * Bundle of the Maps libraries this feature needs. `maps` powers the map
 * itself, `places` the New Places API search, and `marker` the
 * AdvancedMarkerElement (with a `google.maps.Marker` fallback at call sites).
 */
export interface MapsLibraries {
  maps: google.maps.MapsLibrary;
  places: google.maps.PlacesLibrary;
  marker: google.maps.MarkerLibrary;
}

/** Thrown when the loader is invoked without a configured API key. */
export class MissingMapsKeyError extends Error {
  constructor() {
    super(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set — cannot load Google Maps.",
    );
    this.name = "MissingMapsKeyError";
  }
}

// Module-level singletons: one Loader instance and one in-flight promise so
// concurrent callers (map + search box mounting together) share a single load.
let loader: Loader | null = null;
let librariesPromise: Promise<MapsLibraries> | null = null;

function getLoader(): Loader {
  if (!hasMapsApiKey()) {
    throw new MissingMapsKeyError();
  }
  if (!loader) {
    loader = new Loader({
      apiKey: MAPS_API_KEY,
      version: "weekly",
      // libraries here is advisory; we still `importLibrary` each explicitly.
      libraries: ["places", "marker"],
    });
  }
  return loader;
}

/**
 * Load (once) and return the maps + places + marker libraries.
 *
 * The result is memoized; subsequent calls resolve immediately with the same
 * libraries. Throws {@link MissingMapsKeyError} synchronously-ish (via a
 * rejected promise) when no key is configured, so guard with
 * {@link hasMapsApiKey} first for a friendly UI message.
 */
export function loadMapsLibraries(): Promise<MapsLibraries> {
  if (!librariesPromise) {
    const l = getLoader();
    librariesPromise = Promise.all([
      l.importLibrary("maps"),
      l.importLibrary("places"),
      l.importLibrary("marker"),
    ]).then(([maps, places, marker]) => ({ maps, places, marker }));
  }
  return librariesPromise;
}
