import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

export const badgeVariants = cva("inline-flex items-center font-medium", {
  variants: {
    variant: {
      chip:
        "rounded-control px-2 py-0.5 text-xs bg-surface-muted text-foreground border border-border",
      chipPrimary:
        "rounded-control px-2 py-0.5 text-xs bg-primary/10 text-primary border border-primary/20",
      chipMuted:
        "rounded-control px-2 py-0.5 text-xs bg-muted text-muted-foreground",
      status: "gap-1.5 text-xs text-muted-foreground",
    },
    tone: {
      default: "",
      success: "",
      warning: "",
      danger: "",
      info: "",
    },
  },
  compoundVariants: [
    {
      variant: "status",
      tone: "default",
      className: "[&_[data-status-dot]]:bg-zinc-400",
    },
    {
      variant: "status",
      tone: "success",
      className: "[&_[data-status-dot]]:bg-emerald-500",
    },
    {
      variant: "status",
      tone: "warning",
      className: "[&_[data-status-dot]]:bg-amber-500",
    },
    {
      variant: "status",
      tone: "danger",
      className: "[&_[data-status-dot]]:bg-red-500",
    },
    {
      variant: "status",
      tone: "info",
      className: "[&_[data-status-dot]]:bg-sky-500",
    },
  ],
  defaultVariants: {
    variant: "chip",
    tone: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  label?: string;
}

export function Badge({
  className,
  variant,
  tone,
  label,
  children,
  ...props
}: BadgeProps) {
  const content = children ?? label;

  if (variant === "status") {
    return (
      <span
        className={cn(badgeVariants({ variant, tone }), className)}
        {...props}
      >
        <span
          data-status-dot
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          aria-hidden
        />
        {content}
      </span>
    );
  }

  return (
    <span className={cn(badgeVariants({ variant, tone }), className)} {...props}>
      {content}
    </span>
  );
}
