/**
 * A Google place that the user searched/selected, normalized down to the
 * fields the rest of the feature (detail card, marker, save payload) needs.
 *
 * Derived from a `google.maps.places.Place` after `searchByText`/`fetchFields`,
 * but kept as a plain object so non-map components don't depend on the Maps SDK.
 */
export interface SelectedGooglePlace {
  /** Google Place ID (maps to our `google_place_id`). */
  googlePlaceId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  /** Google's average rating (0–5), when available. */
  rating: number | null;
  /** Number of user ratings backing `rating`, when available. */
  userRatingCount: number | null;
}
