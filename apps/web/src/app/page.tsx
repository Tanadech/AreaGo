"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthControl } from "@/components/auth/auth-control";
import { LoginDialog } from "@/components/auth/login-dialog";
import {
  ApiError,
  listPlaces,
  savePlace,
  type Place,
} from "@/lib/api-client";
import type { MapsLibraries } from "@/lib/maps";
import { queryKeys } from "@/lib/query-keys";
import {
  DEFAULT_CENTER,
  MapCanvas,
} from "@/features/map/MapCanvas";
import { PlaceDetailCard } from "@/features/map/PlaceDetailCard";
import { SearchBox } from "@/features/map/SearchBox";
import type { SelectedGooglePlace } from "@/features/map/types";

const EMPTY_PLACES: Place[] = [];

export default function HomePage() {
  const queryClient = useQueryClient();

  // Loaded Maps libraries + map instance (set once MapCanvas is ready).
  const [placesLib, setPlacesLib] = useState<google.maps.PlacesLibrary | null>(
    null,
  );
  const mapRef = useRef<google.maps.Map | null>(null);

  // Selected Google place (search result) shown in the detail card + marker.
  const [selected, setSelected] = useState<SelectedGooglePlace | null>(null);
  const [saved, setSaved] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Login dialog state. `pendingSave` is the place to re-save after login.
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingSaveRef = useRef<SelectedGooglePlace | null>(null);

  // Saved DB places -> markers (requirement 3).
  const placesQuery = useQuery({
    queryKey: queryKeys.places.list(),
    queryFn: () => listPlaces(),
  });
  const savedPlaces = placesQuery.data?.items ?? EMPTY_PLACES;

  const handleMapReady = useCallback(
    (libraries: MapsLibraries, map: google.maps.Map) => {
      setPlacesLib(libraries.places);
      mapRef.current = map;
    },
    [],
  );

  const saveMutation = useMutation({
    mutationFn: (place: SelectedGooglePlace) =>
      savePlace({
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        address: place.address ?? undefined,
        google_place_id: place.googlePlaceId,
      }),
    onSuccess: () => {
      setSaved(true);
      pendingSaveRef.current = null;
      // Refresh saved-place markers.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.places.all(),
      });
    },
    onError: (error: unknown) => {
      // 401 -> not logged in: stash the place and open the login dialog so the
      // save can be retried after authentication (requirement 5).
      if (error instanceof ApiError && error.status === 401) {
        pendingSaveRef.current = selected;
        setLoginOpen(true);
      }
    },
  });

  const handleSelect = useCallback((place: SelectedGooglePlace) => {
    setSelected(place);
    setSaved(false);
    saveMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(() => {
    if (selected) saveMutation.mutate(selected);
  }, [selected, saveMutation]);

  const handleLoginSuccess = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (pending) {
      saveMutation.mutate(pending);
    }
  }, [saveMutation]);

  // Surface non-401 save errors inline on the card.
  const saveError =
    saveMutation.error instanceof ApiError && saveMutation.error.status !== 401
      ? saveMutation.error.message
      : saveMutation.error && !(saveMutation.error instanceof ApiError)
        ? "บันทึกไม่สำเร็จ กรุณาลองใหม่"
        : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">AreaScan</h1>
          <p className="text-xs text-muted-foreground">
            ค้นหาและบันทึกสถานที่ท่องเที่ยว
          </p>
        </div>
        <AuthControl onRequestLogin={() => setLoginOpen(true)} />
      </header>

      <main className="relative flex-1">
        {/* Full-width map (requirement 1). */}
        <div className="absolute inset-0">
          <MapCanvas
            savedPlaces={savedPlaces}
            selected={selected}
            selectedSaved={saved}
            onReady={handleMapReady}
            onError={setMapError}
          />
        </div>

        {/* Floating search + detail panel (requirements 2 & 4). */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3">
            <div className="rounded-card border border-border bg-card p-3 shadow-card">
              <SearchBox
                places={placesLib}
                unavailable={mapError !== null}
                locationBias={
                  mapRef.current?.getCenter()?.toJSON() ?? DEFAULT_CENTER
                }
                onResult={handleSelect}
              />
            </div>

            {selected && (
              <PlaceDetailCard
                place={selected}
                onSave={handleSave}
                saving={saveMutation.isPending}
                saved={saved}
                error={saveError}
              />
            )}
          </div>
        </div>
      </main>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
