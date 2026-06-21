"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthControl } from "@/components/auth/auth-control";
import { LoginDialog } from "@/components/auth/login-dialog";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FieldError,
  Label,
  Spinner,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addTripItem,
  ApiError,
  getTrip,
  listPlaces,
  removeTripItem,
  reorderTripItems,
  type Trip,
  type TripItem,
} from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const NO_ITEMS: TripItem[] = [];

export default function TripEditorPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const queryClient = useQueryClient();

  const selectId = useId();
  const errorId = useId();

  const [placeToAdd, setPlaceToAdd] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const tripQuery = useQuery({
    queryKey: queryKeys.trips.detail(tripId),
    queryFn: () => getTrip(tripId),
    retry: false,
  });
  const placesQuery = useQuery({
    queryKey: queryKeys.places.list(),
    queryFn: () => listPlaces(),
  });

  const trip = tripQuery.data;
  const items = trip?.items ?? NO_ITEMS;
  const savedPlaces = useMemo(
    () => placesQuery.data?.items ?? [],
    [placesQuery.data],
  );

  // On 401 stash the action and open the login dialog; otherwise surface inline.
  const handleMutationError = useCallback(
    (error: unknown, retry: () => void) => {
      if (error instanceof ApiError && error.status === 401) {
        pendingActionRef.current = retry;
        setLoginOpen(true);
        return;
      }
      setActionError(
        error instanceof ApiError
          ? error.message
          : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่",
      );
    },
    [],
  );

  // Reconcile cache with the server's returned trip (and refresh list counts).
  const onMutated = useCallback(
    (updated?: Trip) => {
      setActionError(null);
      pendingActionRef.current = null;
      if (updated) {
        queryClient.setQueryData(queryKeys.trips.detail(tripId), updated);
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.trips.detail(tripId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips.list() });
    },
    [queryClient, tripId],
  );

  const addMutation = useMutation({
    mutationFn: (placeId: string) => addTripItem(tripId, { place_id: placeId }),
    onSuccess: (updated) => {
      onMutated(updated);
      setPlaceToAdd("");
    },
    onError: (error) =>
      handleMutationError(error, () => {
        if (placeToAdd) addMutation.mutate(placeToAdd);
      }),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeTripItem(tripId, itemId),
    onSuccess: () => onMutated(),
    onError: (error, itemId) =>
      handleMutationError(error, () => removeMutation.mutate(itemId)),
  });

  const reorderMutation = useMutation({
    mutationFn: (ordered: TripItem[]) =>
      reorderTripItems(tripId, {
        items: ordered.map((item, index) => ({
          id: item.id,
          day_no: item.day_no ?? 1,
          sort_order: index,
        })),
      }),
    onSuccess: (updated) => onMutated(updated),
    onError: (error, ordered) =>
      handleMutationError(error, () => reorderMutation.mutate(ordered)),
  });

  // Move an item up/down, recompute sort_order, and persist (requirement 4).
  const move = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      const a = next[index];
      const b = next[target];
      if (a === undefined || b === undefined) return;
      next[index] = b;
      next[target] = a;
      reorderMutation.mutate(next);
    },
    [items, reorderMutation],
  );

  const handleLoginSuccess = useCallback(() => {
    void tripQuery.refetch();
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  }, [tripQuery]);

  const busy =
    addMutation.isPending ||
    removeMutation.isPending ||
    reorderMutation.isPending;

  const isUnauthorized =
    tripQuery.error instanceof ApiError && tripQuery.error.status === 401;
  const isNotFound =
    tripQuery.error instanceof ApiError && tripQuery.error.status === 404;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/trips"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ← ทริปทั้งหมด
          </Link>
          <h1 className="text-lg font-bold tracking-tight">
            {trip?.title ?? "ทริป"}
          </h1>
          {trip && <Badge variant="info">{trip.status}</Badge>}
        </div>
        <AuthControl onRequestLogin={() => setLoginOpen(true)} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {tripQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Spinner aria-label="กำลังโหลดทริป" />
          </div>
        ) : isUnauthorized ? (
          <Card>
            <CardBody className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                กรุณาเข้าสู่ระบบเพื่อแก้ไขทริปนี้
              </p>
              <Button size="sm" onClick={() => setLoginOpen(true)}>
                เข้าสู่ระบบ
              </Button>
            </CardBody>
          </Card>
        ) : isNotFound ? (
          <Card>
            <CardBody className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">ไม่พบทริปนี้</p>
              <Link
                href="/trips"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                กลับไปหน้าทริป
              </Link>
            </CardBody>
          </Card>
        ) : tripQuery.isError || !trip ? (
          <Card>
            <CardBody className="flex flex-col items-start gap-3">
              <p className="text-sm text-danger-600">
                โหลดทริปไม่สำเร็จ กรุณาลองใหม่
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void tripQuery.refetch()}
              >
                ลองใหม่
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{trip.days} วัน</span>
              <span>{items.length} สถานที่</span>
              <Badge variant="success">บันทึกอัตโนมัติ</Badge>
            </div>

            {/* Add a place from the saved catalog (requirement 2). */}
            <Card>
              <CardHeader>
                <CardTitle>เพิ่มสถานที่</CardTitle>
              </CardHeader>
              <CardBody>
                {savedPlaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ยังไม่มีสถานที่ที่บันทึกไว้ —{" "}
                    <Link href="/" className="text-primary-600 underline">
                      ไปบันทึกจากหน้าแผนที่ก่อน
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label htmlFor={selectId}>เลือกสถานที่</Label>
                      <select
                        id={selectId}
                        value={placeToAdd}
                        onChange={(e) => setPlaceToAdd(e.target.value)}
                        className={cn(
                          "h-10 rounded-md border border-input bg-background px-3 text-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                      >
                        <option value="">— เลือกสถานที่ —</option>
                        {savedPlaces.map((place) => (
                          <option key={place.id} value={place.id}>
                            {place.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      loading={addMutation.isPending}
                      disabled={!placeToAdd || busy}
                      onClick={() => placeToAdd && addMutation.mutate(placeToAdd)}
                    >
                      เพิ่มเข้าทริป
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Itinerary: ordered items with reorder + remove (req 3 & 4). */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                แผนการเดินทาง
              </h2>
              {items.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีสถานที่ในทริป เพิ่มจากด้านบนได้เลย
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <ol className="flex flex-col gap-2">
                  {items.map((item, index) => (
                    <li key={item.id}>
                      <Card>
                        <CardBody className="flex items-center gap-3 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {item.place_name ?? "สถานที่"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="เลื่อนขึ้น"
                              disabled={index === 0 || busy}
                              onClick={() => move(index, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="เลื่อนลง"
                              disabled={index === items.length - 1 || busy}
                              onClick={() => move(index, 1)}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              disabled={busy}
                              onClick={() => removeMutation.mutate(item.id)}
                            >
                              ลบ
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-2">
                <FieldError id={errorId}>{actionError}</FieldError>
              </div>
            </section>
          </div>
        )}
      </main>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
