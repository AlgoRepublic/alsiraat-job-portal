import { cn } from "@/utils/cn";

/** Shared error ring/border for Input, Textarea, and CustomUI triggers. */
export function fieldErrorClass(hasError?: boolean, className?: string) {
  return cn(
    hasError && "border-red-500 focus-visible:ring-red-500/30",
    className,
  );
}
