import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

export type StatusTone = NonNullable<BadgeProps["tone"]>;

const APPLICATION_STATUS_TONE: Record<string, StatusTone> = {
  Pending: "warning",
  Reviewing: "info",
  Shortlisted: "info",
  Approved: "success",
  Accepted: "success",
  "Offer Accepted": "success",
  Completed: "success",
  Offered: "info",
  Rejected: "danger",
  Declined: "danger",
  "Offer Declined": "danger",
  "Completion Rejected": "danger",
  "Completion Requested": "info",
};

export function applicationStatusTone(status: string): StatusTone {
  return APPLICATION_STATUS_TONE[status] ?? "default";
}

export function ApplicationStatusLabel({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="status"
      tone={applicationStatusTone(status)}
      className={className}
    >
      {status}
    </Badge>
  );
}

const JOB_STATUS_TONE: Record<string, StatusTone> = {
  Open: "success",
  Active: "success",
  Published: "success",
  Approved: "success",
  Completed: "info",
  Draft: "default",
  Pending: "warning",
  "Pending Approval": "warning",
  "Changes Requested": "danger",
  Closed: "default",
  Archived: "default",
  Filled: "info",
};

export function jobStatusTone(status: string): StatusTone {
  return JOB_STATUS_TONE[status] ?? "default";
}

export function JobStatusLabel({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant="status" tone={jobStatusTone(status)} className={className}>
      {status}
    </Badge>
  );
}
