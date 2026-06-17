import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Marks the field as invalid: applies danger styling and sets
   * `aria-invalid`. Pair with a {@link FieldError} referenced by
   * `aria-describedby` for an accessible error association.
   */
  invalid?: boolean;
}

/**
 * Text input with token-driven theming, a focus ring, and an invalid state.
 *
 * The `peer` class lets sibling {@link Label}s react to disabled state and
 * enables peer-based styling in consuming layouts.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid ? true : ariaInvalid}
      className={cn(
        "peer flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid
          ? "border-danger-500 focus-visible:ring-danger-500"
          : "border-input",
        className,
      )}
      {...props}
    />
  );
});
