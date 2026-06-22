import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        neutral:
          "border-transparent bg-muted text-muted-foreground",
        primary:
          "border-transparent bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100",
        accent:
          "border-transparent bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-100",
        success:
          "border-transparent bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-100",
        warning:
          "border-transparent bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-100",
        danger:
          "border-transparent bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-100",
        info:
          "border-transparent bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-100",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Compact status / category label.
 *
 * Variants: neutral | primary | accent | success | warning | danger | info |
 * outline. Each variant carries paired light/dark colors for legibility.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});
