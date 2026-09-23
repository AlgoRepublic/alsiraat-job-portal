import React from "react";
import {
  Award,
  Target,
  Eye,
  User,
  Calendar,
  FileText,
  Download,
} from "lucide-react";
import { Job } from "../types";
import { TaskRewardText } from "./TaskRewardText";
import { formatTaskDateOrNA } from "../utils/formatTaskDate";
import {
  formatOptionalTaskDuration,
  formatOptionalTaskLocation,
} from "../utils/formatOptionalTaskField";
import {
  TaskProvenanceHeader,
  AudienceTargetingPresentation,
} from "../utils/taskDetailPresentation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface PrivilegedTaskDetailSectionsProps {
  job: Job;
  provenance: TaskProvenanceHeader;
  audience: AudienceTargetingPresentation;
  rewardOrganisationId?: string | null;
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card radius="surface" padding="section" shadow="sm" className="surface-panel-lg">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </Card>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block normal-case tracking-normal">{label}</Label>
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export const PrivilegedTaskDetailSections: React.FC<
  PrivilegedTaskDetailSectionsProps
> = ({ job, provenance, audience, rewardOrganisationId }) => {
  const hoursLabel = formatOptionalTaskDuration(job.hoursRequired, "hours");

  return (
    <div className="lg:col-span-2 space-y-6">
      <DetailSection
        title="Provenance"
        icon={<User className="w-4 h-4 text-primary" />}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 dark:text-white">
            {provenance.submitterName}
          </span>
          <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
            ·
          </span>
          <span>Last updated {provenance.lastUpdatedLabel}</span>
          <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
            ·
          </span>
          <span>{provenance.organisationName}</span>
        </div>
      </DetailSection>

      <DetailSection
        title="Schedule & Logistics"
        icon={<Calendar className="w-4 h-4 text-primary" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <DetailField
            label="Location"
            value={formatOptionalTaskLocation(job.location)}
          />
          <DetailField label="Duration" value={hoursLabel} />
          <DetailField
            label="Applications Open"
            value={formatTaskDateOrNA(job.applicationOpenDate)}
          />
          <DetailField
            label="Applications Close"
            value={formatTaskDateOrNA(job.applicationCloseDate)}
          />
          <DetailField
            label="Task Start Date"
            value={formatTaskDateOrNA(job.startDate) || "Not set"}
          />
        </div>
      </DetailSection>

      <DetailSection
        title="Compensation"
        icon={<Award className="w-4 h-4 text-primary" />}
      >
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
          <TaskRewardText
            task={{
              rewardType: job.rewardType,
              rewardValue: job.rewardValue,
              rewardText: job.rewardText,
            }}
            organisationId={rewardOrganisationId}
          />
        </p>
      </DetailSection>

      <DetailSection
        title="Audience & Targeting"
        icon={<Eye className="w-4 h-4 text-primary" />}
      >
        <div className="space-y-4">
          <DetailField label="Visibility" value={audience.visibilityLabel} />
          {audience.privateAudienceLabels && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                Private Audience
              </Label>
              <div className="flex flex-wrap gap-2">
                {audience.privateAudienceLabels.map((label) => (
                  <Badge key={label} variant="chipPrimary">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {audience.showTargetGroups && audience.targetGroupSections && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                Target Groups
              </Label>
              {audience.targetGroupsLoadFailed && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  Some group names could not be loaded.
                </p>
              )}
              <div className="space-y-3">
                {audience.targetGroupSections.map((section) => (
                  <div key={section.kindLabel}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      {section.kindLabel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.labels.map((label) => (
                        <Badge key={`${section.kindLabel}-${label}`} variant="chip">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {audience.showTargetGroups &&
            !audience.targetGroupSections &&
            audience.targetGroupLabels && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                Target Groups
              </Label>
              {audience.targetGroupsLoadFailed && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  Some group names could not be loaded.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {audience.targetGroupLabels.map((label) => (
                  <Badge key={label} variant="chip">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DetailSection>

      <DetailSection
        title="Requirements & Content"
        icon={<Target className="w-4 h-4 text-primary" />}
      >
        <div className="space-y-6">
          <div>
            <Label className="mb-2 block normal-case tracking-normal">
              Task Description
            </Label>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>
          </div>

          {job.selectionCriteria?.trim() && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                What we look for
              </Label>
              <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-control border border-border">
                {job.selectionCriteria}
              </div>
            </div>
          )}

          {(job.requiredSkills || []).length > 0 && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                Required Skills
              </Label>
              <div className="flex flex-wrap gap-2">
                {(job.requiredSkills || []).map((skill) => (
                  <Badge key={skill} variant="chipPrimary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(job.attachments || []).length > 0 && (
            <div>
              <Label className="mb-2 block normal-case tracking-normal">
                Attachments
              </Label>
              <div className="space-y-2">
                {(job.attachments || []).map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-control bg-zinc-50 dark:bg-zinc-800/50 border border-border hover:bg-zinc-100/70 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-zinc-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </DetailSection>
    </div>
  );
};
