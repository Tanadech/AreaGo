"use client";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import type { SelectedGooglePlace } from "./types";

export interface PlaceDetailCardProps {
  place: SelectedGooglePlace;
  /** Triggers the save flow (POST /api/v1/places). */
  onSave: () => void;
  /** Save request in flight. */
  saving?: boolean;
  /** The place was saved successfully (shows an inline success state). */
  saved?: boolean;
  /** Inline error message from the save attempt, if any. */
  error?: string | null;
}

/** Small star glyph used next to the Google rating. */
function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-accent-500" aria-hidden>
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

/**
 * Details card for the currently selected Google place (requirement 4):
 * name, address, coordinates, Google rating (when present), and a Save button.
 */
export function PlaceDetailCard({
  place,
  onSave,
  saving = false,
  saved = false,
  error = null,
}: PlaceDetailCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{place.name}</CardTitle>
          {place.rating != null && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
              <StarIcon />
              {place.rating.toFixed(1)}
              {place.userRatingCount != null && (
                <span className="text-muted-foreground">
                  ({place.userRatingCount.toLocaleString()})
                </span>
              )}
            </span>
          )}
        </div>
      </CardHeader>

      <CardBody className="flex flex-col gap-2 text-sm">
        {place.address && (
          <p className="text-muted-foreground">{place.address}</p>
        )}
        <p className="font-mono text-xs text-muted-foreground">
          {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
        </p>

        {saved && (
          <Badge variant="success" className="mt-1 w-fit">
            บันทึกสถานที่แล้ว
          </Badge>
        )}
        {error && (
          <p role="alert" className="mt-1 text-sm font-medium text-danger-600">
            {error}
          </p>
        )}
      </CardBody>

      <CardFooter className="justify-end">
        <Button onClick={onSave} loading={saving} disabled={saved}>
          {saved ? "บันทึกแล้ว" : "บันทึกสถานที่"}
        </Button>
      </CardFooter>
    </Card>
  );
}
