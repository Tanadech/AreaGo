import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

/**
 * Button variant + size definitions. The base classes cover layout, typography,
 * focus-visible ring, and disabled handling shared by every variant.
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium transition-colors select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-primary-foreground hover:bg-primary-700 active:bg-primary-800",
        secondary:
          "bg-muted text-foreground hover:bg-neutral-200 active:bg-neutral-300 dark:hover:bg-neutral-700 dark:active:bg-neutral-600",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-muted active:bg-neutral-200 dark:active:bg-neutral-700",
        ghost:
          "bg-transparent text-foreground hover:bg-muted active:bg-neutral-200 dark:active:bg-neutral-700",
        danger:
          "bg-danger-600 text-danger-foreground hover:bg-danger-700 active:bg-danger-700",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and disable interaction while an action is in flight. */
  loading?: boolean;
}

/**
 * Primary interactive control.
 *
 * - Variants: primary | secondary | outline | ghost | danger
 * - Sizes: sm | md | lg
 * - `loading` shows a {@link Spinner}, hides label-affecting pointer events, and
 *   sets `aria-busy`. The button is also disabled while loading.
 * - Always renders a visible `focus-visible` ring for keyboard users.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, loading = false, disabled, children, type, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Spinner size="sm" aria-hidden className="shrink-0" />}
        {children}
      </button>
    );
  },
);
