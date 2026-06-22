"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Selector matching elements that can receive keyboard focus. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface ModalProps {
  /** Whether the dialog is rendered/open. */
  open: boolean;
  /** Called when the user requests close (ESC, backdrop click, close button). */
  onClose: () => void;
  /** Accessible title; rendered in the header and wired to `aria-labelledby`. */
  title?: ReactNode;
  /** Optional supporting text wired to `aria-describedby`. */
  description?: ReactNode;
  /** Dialog body content. */
  children?: ReactNode;
  /** Optional footer (e.g. action buttons). */
  footer?: ReactNode;
  /** Disable closing when the backdrop is clicked. */
  disableBackdropClose?: boolean;
  /** Extra classes for the dialog panel. */
  className?: string;
}

/**
 * Accessible modal dialog.
 *
 * Accessibility / behavior:
 * - `role="dialog"` + `aria-modal="true"`, labelled/described by its title/desc.
 * - Focus is moved into the dialog on open and restored to the previously
 *   focused element on close.
 * - Tab / Shift+Tab are trapped within the dialog (focus cycles).
 * - ESC closes; clicking the backdrop closes (unless `disableBackdropClose`).
 * - Body scroll is locked while open.
 * - Rendered into a portal on `document.body`.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  disableBackdropClose = false,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Stable close handler for event listeners.
  const handleClose = useCallback(() => onClose(), [onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Move focus into the dialog on open; restore it on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }

    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Keyboard handling: ESC to close, Tab to trap focus.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        handleClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === panel) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, handleClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Backdrop. Clicking it (but not the panel) closes the dialog.
      onMouseDown={(event) => {
        if (disableBackdropClose) return;
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-card border border-border bg-card text-card-foreground shadow-lg outline-none",
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="flex flex-col gap-1">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="-mr-2 -mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-6 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
