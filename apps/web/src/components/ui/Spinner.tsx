import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const spinnerVariants = cva("animate-spin text-current", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label announced to screen readers. Defaults to "Loading". */
  label?: string;
}

/**
 * Indeterminate loading indicator.
 *
 * Renders an SVG ring that inherits `currentColor`. When used decoratively
 * (e.g. inside a Button alongside text) pass `aria-hidden`; standalone it
 * exposes `role="status"` with a visually-hidden label.
 */
export function Spinner({
  className,
  size,
  label = "Loading",
  "aria-hidden": ariaHidden,
  ...props
}: SpinnerProps) {
  return (
    <svg
      className={cn(spinnerVariants({ size }), className)}
      viewBox="0 0 24 24"
      fill="none"
      role={ariaHidden ? undefined : "status"}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : label}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
