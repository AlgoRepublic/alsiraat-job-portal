import * as React from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/utils/cn";
import type { MemberRoleView } from "@/shared/memberRoleView";

const ROLE_NAME_COLOUR: Record<string, string> = {
  "Super Admin":
    "bg-red-100 text-red-700 border-red-200/60 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/40",
  "Organisation Admin":
    "bg-orange-100 text-orange-700 border-orange-200/60 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800/40",
  "Task Manager":
    "bg-violet-100 text-violet-700 border-violet-200/60 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800/40",
  "Task Advertiser":
    "bg-blue-100 text-blue-700 border-blue-200/60 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40",
  Applicant:
    "bg-zinc-100 text-zinc-600 border-border dark:bg-zinc-800 dark:text-zinc-300",
};

export function roleNameColourClass(name: string): string {
  return (
    ROLE_NAME_COLOUR[name] ??
    "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20"
  );
}

export function RoleNameBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Badge
      variant="chip"
      className={cn(
        "font-medium normal-case tracking-normal",
        roleNameColourClass(name),
        className,
      )}
    >
      {name}
    </Badge>
  );
}

export function MemberRoleBadge({ role }: { role: MemberRoleView }) {
  if (role.isActive === false) {
    return (
      <Badge
        variant="chip"
        className="border-amber-200/60 bg-amber-50 font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-200"
      >
        {role.name} (inactive)
      </Badge>
    );
  }
  return <RoleNameBadge name={role.name} />;
}

export function MemberRoleBadges({
  roles,
  className,
}: {
  roles: MemberRoleView[];
  className?: string;
}) {
  if (roles.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {roles.map((role) => (
        <MemberRoleBadge key={role.id} role={role} />
      ))}
    </div>
  );
}
