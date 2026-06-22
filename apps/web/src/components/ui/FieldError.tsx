import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Inline validation message for a form field.
 *
 * Renders nothing when it has no children, so it is safe to mount
 * unconditionally. Uses `role="alert"` so screen readers announce the message
 * when it appears. Wire it to its input via `id` + the input's
 * `aria-describedby`.
 */
export const FieldError = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function FieldError({ className, children, ...props }, ref) {
  if (!children) return null;
  return (
    <p
      ref={ref}
      role="alert"
      className={cn("text-sm font-medium text-danger-600", className)}
      {...props}
    >
      {children}
    </p>
  );
});
