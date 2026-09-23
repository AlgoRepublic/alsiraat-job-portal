import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

export const cardVariants = cva("bg-surface border border-border text-foreground", {
  variants: {
    padding: {
      none: "p-0",
      card: "p-card",
      section: "p-section",
    },
    radius: {
      control: "rounded-control",
      surface: "rounded-surface",
    },
    shadow: {
      none: "",
      sm: "shadow-sm",
    },
  },
  defaultVariants: {
    padding: "card",
    radius: "control",
    shadow: "sm",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  padding,
  radius,
  shadow,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ padding, radius, shadow }), className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-border px-card py-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-card pt-0", className)} {...props} />;
}
