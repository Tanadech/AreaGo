"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type FormEvent } from "react";
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
  Input,
  Label,
  Spinner,
} from "@/components/ui";
import { ApiError, createTrip, listTrips, type TripListItem } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_TRIPS: TripListItem[] = [];

/** Map a trip status to a Badge variant for a quick visual cue. */
function statusVariant(
  status: string,
): "neutral" | "success" | "info" | "warning" {
  switch (status) {
    case "published":
    case "active":
      return "success";
    case "archived":
      return "neutral";
    case "draft":
      return "info";
    default:
      return "warning";
  }
}

export default function TripsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const titleId = useId();
  const daysId = useId();
  const errorId = useId();

  const [title, setTitle] = useState("");
  const [days, setDays] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);

  // Login dialog state. The pending action is replayed after a successful login.
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const tripsQuery = useQuery({
    queryKey: queryKeys.trips.list(),
    queryFn: listTrips,
  });
  const trips = tripsQuery.data ?? EMPTY_TRIPS;

  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      pendingActionRef.current = null;
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips.all() });
      router.push(`/trips/${trip.id}`);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        // Stash the create so it can be retried once the user logs in.
        const payload = {
          title: title.trim(),
          days: Math.max(1, Number.parseInt(days, 10) || 1),
        };
        pendingActionRef.current = () => createMutation.mutate(payload);
        setLoginOpen(true);
      }
    },
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const trimmed = title.trim();
      if (!trimmed) {
        setFormError("กรุณากรอกชื่อทริป");
        return;
      }
      const parsedDays = Number.parseInt(days, 10);
      if (!Number.isFinite(parsedDays) || parsedDays < 1) {
        setFormError("จำนวนวันต้องมากกว่าหรือเท่ากับ 1");
        return;
      }

      createMutation.mutate({ title: trimmed, days: parsedDays });
    },
    [title, days, createMutation],
  );

  const handleLoginSuccess = useCallback(() => {
    void tripsQuery.refetch();
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    pending?.();
  }, [tripsQuery]);

  const isUnauthorized =
    tripsQuery.error instanceof ApiError && tripsQuery.error.status === 401;

  // Non-401 create errors surface inline (401 opens the login dialog instead).
  const createError =
    createMutation.error instanceof ApiError &&
    createMutation.error.status !== 401
      ? createMutation.error.message
      : createMutation.error && !(createMutation.error instanceof ApiError)
        ? "สร้างทริปไม่สำเร็จ กรุณาลองใหม่"
        : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">วางแผนทริป</h1>
          <p className="text-xs text-muted-foreground">
            สร้างและจัดการแผนการเดินทางของคุณ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            แผนที่
          </Link>
          <AuthControl onRequestLogin={() => setLoginOpen(true)} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        {/* New trip form (requirement 1: Create). */}
        <Card>
          <CardHeader>
            <CardTitle>สร้างทริปใหม่</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={titleId} required>
                  ชื่อทริป
                </Label>
                <Input
                  id={titleId}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  invalid={Boolean(formError) && !title.trim()}
                  aria-describedby={formError ? errorId : undefined}
                  placeholder="เช่น เที่ยวเชียงใหม่ 3 วัน"
                />
              </div>
              <div className="flex w-full flex-col gap-1.5 sm:w-28">
                <Label htmlFor={daysId} required>
                  จำนวนวัน
                </Label>
                <Input
                  id={daysId}
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  aria-describedby={formError ? errorId : undefined}
                />
              </div>
              <Button type="submit" loading={createMutation.isPending}>
                สร้างทริป
              </Button>
            </form>
            <div className="mt-2">
              <FieldError id={errorId}>{formError ?? createError}</FieldError>
            </div>
          </CardBody>
        </Card>

        {/* Trip list (TripListItem cards). */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            ทริปของคุณ
          </h2>

          {tripsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Spinner aria-label="กำลังโหลดทริป" />
            </div>
          ) : isUnauthorized ? (
            <Card>
              <CardBody className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  กรุณาเข้าสู่ระบบเพื่อดูทริปของคุณ
                </p>
                <Button size="sm" onClick={() => setLoginOpen(true)}>
                  เข้าสู่ระบบ
                </Button>
              </CardBody>
            </Card>
          ) : tripsQuery.isError ? (
            <Card>
              <CardBody className="flex flex-col items-start gap-3">
                <p className="text-sm text-danger-600">
                  โหลดทริปไม่สำเร็จ กรุณาลองใหม่
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void tripsQuery.refetch()}
                >
                  ลองใหม่
                </Button>
              </CardBody>
            </Card>
          ) : trips.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีทริป เริ่มสร้างทริปแรกของคุณด้านบนได้เลย
                </p>
              </CardBody>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {trips.map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Card className="h-full transition-colors hover:border-primary-400">
                      <CardBody className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold leading-tight">
                            {trip.title}
                          </span>
                          <Badge variant={statusVariant(trip.status)}>
                            {trip.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{trip.days} วัน</span>
                          <span>{trip.item_count} สถานที่</span>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
