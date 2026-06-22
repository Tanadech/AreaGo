import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge configured to understand this project's custom theme keys so
 * conflicting overrides resolve last-wins instead of both classes surviving.
 *
 * Registers the custom utilities added in `tailwind.config.ts`:
 * - `rounded-card`  -> border-radius group
 * - `shadow-card` / `shadow-focus` -> box-shadow group
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["card"] }],
      shadow: [{ shadow: ["card", "focus"] }],
    },
  },
});

/**
 * Merge class names with Tailwind-aware conflict resolution.
 *
 * Combines {@link clsx} (conditional/array/object class composition) with
 * tailwind-merge (last-wins de-duplication of conflicting Tailwind utilities,
 * e.g. `px-2 px-4` -> `px-4`, and now `rounded-card rounded-lg` -> `rounded-lg`).
 * This is the single class-name primitive used by every UI component so
 * consumers can always override styles via `className`.
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-primary-600", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
