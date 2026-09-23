import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-sm hover:bg-primaryHover",
        secondary:
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        ghost:
          "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700",
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
        success:
          "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50",
        dangerSoft:
          "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50",
        infoSoft:
          "border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/50",
        violetSoft:
          "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50",
        amberSoft:
          "border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50",
        toggleOn:
          "border-2 border-primary bg-primary text-white shadow-sm hover:bg-primaryHover",
        toggleOff:
          "border border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      },
      size: {
        default: "h-10 px-4",
        compact: "h-9 px-3",
        /** Table/list row actions — equal height and minimum width */
        action: "h-9 min-w-[6.5rem] px-3 text-xs font-semibold",
        /** Segmented toggles (Internal/External, group chips) */
        toggle: "h-10 min-w-[8.5rem] px-4 text-xs font-semibold",
        chip: "h-9 min-w-[7.5rem] px-3 text-xs font-medium",
        icon: "h-10 w-10 p-0",
        iconCompact: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
