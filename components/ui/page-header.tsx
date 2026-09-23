import * as React from "react";
import { cn } from "@/utils/cn";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  titleAs?: "h1" | "h2";
  size?: "default" | "lg";
}

export function PageHeader({
  title,
  description,
  actions,
  titleAs = "h1",
  size = "default",
  className,
  ...props
}: PageHeaderProps) {
  const TitleTag = titleAs;

  return (
    <header
      className={cn(
        "mb-section flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <TitleTag
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "lg" ? "text-title-page-lg" : "text-title-page",
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
