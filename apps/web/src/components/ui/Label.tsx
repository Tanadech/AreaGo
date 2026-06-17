import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Render a danger-colored asterisk to mark the field as required. */
  required?: boolean;
}

/**
 * Form label. Pair with an {@link Input} via matching `htmlFor` / `id`.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, children, required, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger-600" aria-hidden>
          *
        </span>
      )}
    </label>
  );
});
