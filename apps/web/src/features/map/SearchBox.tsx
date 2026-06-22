"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import type { SelectedGooglePlace } from "./types";

export interface SearchBoxProps {
  /**
   * The loaded Places library (New Places API). Provided by the parent once
   * the Maps SDK has finished loading, so the search button only enables when
   * search is actually possible.
   */
  places: google.maps.PlacesLibrary | null;
  /**
   * Bias results toward the current map viewport center for more relevant hits.
   */
  locationBias?: google.maps.LatLngLiteral;
  /** Called with the top match when a search resolves. */
  onResult: (place: SelectedGooglePlace) => void;
  /** Called when a search yields no results. */
  onNoResults?: () => void;
  /** True when the map / Maps API is unavailable (e.g. missing API key). */
  unavailable?: boolean;
}

// Fields we request from the New Places API. Each requested field is billed,
// so we keep this to exactly what the detail card + save payload consume.
const SEARCH_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
] as const;

/**
 * Place search using the CURRENT Places API (`Place.searchByText`), which is
 * the only autocomplete/search surface enabled on newly-created keys
 * ("Places API (New)"). Returns the top text-search match to the parent.
 */
export function SearchBox({
  places,
  locationBias,
  onResult,
  onNoResults,
  unavailable = false,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textQuery = query.trim();
    if (!places || !textQuery || searching) return;

    setSearching(true);
    setError(null);

    try {
      const { places: results } = await places.Place.searchByText({
        textQuery,
        fields: [...SEARCH_FIELDS],
        maxResultCount: 1,
        ...(locationBias ? { locationBias } : {}),
      });

      const top = results[0];
      if (!top || !top.location) {
        onNoResults?.();
        return;
      }

      onResult({
        googlePlaceId: top.id,
        name: top.displayName ?? textQuery,
        address: top.formattedAddress ?? null,
        lat: top.location.lat(),
        lng: top.location.lng(),
        rating: top.rating ?? null,
        userRatingCount: top.userRatingCount ?? null,
      });
    } catch {
      setError("ค้นหาไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSearching(false);
    }
  }

  return (
    <form className="flex flex-col gap-1" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาสถานที่ เช่น Wat Arun, ICONSIAM"
          aria-label="ค้นหาสถานที่"
          disabled={!places || unavailable}
        />
        <Button
          type="submit"
          loading={searching}
          disabled={!places || unavailable || !query.trim()}
          className="shrink-0"
        >
          ค้นหา
        </Button>
      </div>
      {unavailable ? (
        <p className="text-xs text-muted-foreground">ค้นหาไม่พร้อมใช้งาน</p>
      ) : !places ? (
        <p className="text-xs text-muted-foreground">กำลังโหลดแผนที่…</p>
      ) : null}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </form>
  );
}
