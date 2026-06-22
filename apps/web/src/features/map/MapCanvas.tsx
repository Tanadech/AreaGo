"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import {
  hasMapsApiKey,
  loadMapsLibraries,
  type MapsLibraries,
} from "@/lib/maps";
import type { Place } from "@/lib/api-client";
import type { SelectedGooglePlace } from "./types";

/** Bangkok — sensible default center for the AreaScan audience. */
export const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 13.7563,
  lng: 100.5018,
};
export const DEFAULT_ZOOM = 12;

/**
 * Optional Map ID. When configured, the map is a vector map and we can use the
 * modern AdvancedMarkerElement. Without it we fall back to google.maps.Marker.
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? undefined;

export interface MapCanvasProps {
  /** Saved DB places to drop markers for (requirement 3). */
  savedPlaces: Place[];
  /** The currently selected Google place (search result), if any. */
  selected: SelectedGooglePlace | null;
  /**
   * When true, the selected place has already been saved (so it now renders as a
   * DB marker); suppress the duplicate "selected" pin at the same coordinates.
   */
  selectedSaved?: boolean;
  /**
   * Fired once the map + libraries are ready, handing the parent the loaded
   * libraries and the map instance (used by the search box for location bias).
   */
  onReady?: (libraries: MapsLibraries, map: google.maps.Map) => void;
  /** Fired with a human-readable message if the map cannot be displayed. */
  onError?: (message: string) => void;
}

/**
 * Minimal union of the marker types we create, so we can clear them uniformly
 * regardless of which API path we took.
 */
type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

function setMarkerMap(marker: AnyMarker, map: google.maps.Map | null) {
  // AdvancedMarkerElement exposes a `map` property; the classic Marker uses
  // setMap(). Branch on which API the instance implements.
  if (marker instanceof google.maps.marker.AdvancedMarkerElement) {
    marker.map = map;
  } else {
    marker.setMap(map);
  }
}

/**
 * The Google Map (requirement 1) plus all markers (requirement 3).
 *
 * Marker strategy: prefer AdvancedMarkerElement when a Map ID is configured
 * (NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID -> vector map); otherwise fall back to the
 * classic google.maps.Marker, which works on any map without a Map ID.
 */
export function MapCanvas({
  savedPlaces,
  selected,
  selectedSaved = false,
  onReady,
  onError,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const librariesRef = useRef<MapsLibraries | null>(null);
  const savedMarkersRef = useRef<AnyMarker[]>([]);
  const selectedMarkerRef = useRef<AnyMarker | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize the map exactly once.
  useEffect(() => {
    if (!hasMapsApiKey()) {
      const message =
        "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — ไม่สามารถโหลดแผนที่ได้";
      setStatus("error");
      setErrorMessage(message);
      onError?.(message);
      return;
    }

    let cancelled = false;

    loadMapsLibraries()
      .then((libraries) => {
        if (cancelled || !containerRef.current) return;
        librariesRef.current = libraries;

        const map = new libraries.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapId: MAP_ID,
          disableDefaultUI: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        setStatus("ready");
        onReady?.(libraries, map);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "โหลดแผนที่ไม่สำเร็จ";
        setStatus("error");
        setErrorMessage(message);
        onError?.(message);
      });

    return () => {
      cancelled = true;
    };
    // onReady is intentionally not a dependency — map init must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Create a marker using AdvancedMarkerElement when possible, else Marker. */
  function makeMarker(
    position: google.maps.LatLngLiteral,
    title: string,
  ): AnyMarker {
    const libraries = librariesRef.current;
    const map = mapRef.current;
    if (!libraries || !map) {
      throw new Error("Map not ready");
    }
    if (MAP_ID) {
      return new libraries.marker.AdvancedMarkerElement({
        map,
        position,
        title,
      });
    }
    // Fallback for keys/maps without a Map ID (no vector map -> no Advanced
    // markers). google.maps.Marker still works everywhere.
    return new libraries.marker.Marker({ map, position, title });
  }

  // Sync saved-place markers whenever the list changes.
  useEffect(() => {
    if (status !== "ready") return;
    const map = mapRef.current;
    if (!map) return;

    // Clear previous saved markers.
    for (const marker of savedMarkersRef.current) {
      setMarkerMap(marker, null);
    }
    savedMarkersRef.current = [];

    for (const place of savedPlaces) {
      const marker = makeMarker(
        { lat: place.lat, lng: place.lng },
        place.name,
      );
      savedMarkersRef.current.push(marker);
    }
    // makeMarker reads refs only; safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPlaces, status]);

  // Sync the selected Google place marker + recenter on it.
  useEffect(() => {
    if (status !== "ready") return;
    const map = mapRef.current;
    if (!map) return;

    if (selectedMarkerRef.current) {
      setMarkerMap(selectedMarkerRef.current, null);
      selectedMarkerRef.current = null;
    }

    if (selected) {
      const position = { lat: selected.lat, lng: selected.lng };
      map.panTo(position);
      if ((map.getZoom() ?? DEFAULT_ZOOM) < 14) map.setZoom(15);
      // Once saved, the place appears as a DB marker — don't stack a duplicate
      // "selected" pin at the same coordinates.
      if (!selectedSaved) {
        selectedMarkerRef.current = makeMarker(position, selected.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedSaved, status]);

  // Detach all markers on unmount. The SPA never unmounts the map today, but this
  // prevents dangling AdvancedMarkerElement DOM/listeners if it ever does.
  useEffect(() => {
    return () => {
      for (const marker of savedMarkersRef.current) setMarkerMap(marker, null);
      if (selectedMarkerRef.current) {
        setMarkerMap(selectedMarkerRef.current, null);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="แผนที่"
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <Spinner size="lg" label="กำลังโหลดแผนที่" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-card border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            <p className="font-medium text-foreground">ไม่สามารถแสดงแผนที่</p>
            <p className="mt-2">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
