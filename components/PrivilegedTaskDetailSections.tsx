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
  TaskProvenanceHeader,
  AudienceTargetingPresentation,
} from "../utils/taskDetailPresentation";

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
    <section
      className="glass-card rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800"
    >
      <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
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
      <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export const PrivilegedTaskDetailSections: React.FC<
  PrivilegedTaskDetailSectionsProps
> = ({ job, provenance, audience, rewardOrganisationId }) => {
  const hoursLabel =
    job.hoursRequired != null && job.hoursRequired > 0
      ? `${job.hoursRequired} Hours`
      : "N/A";

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
          <DetailField label="Location" value={job.location || "N/A"} />
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
        <p className="text-lg font-bold text-zinc-900 dark:text-white">
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
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
                Private Audience
              </p>
              <div className="flex flex-wrap gap-2">
                {audience.privateAudienceLabels.map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {audience.showTargetGroups && audience.targetGroupLabels && (
            <div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
                Target Groups
              </p>
              {audience.targetGroupsLoadFailed && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  Some group names could not be loaded.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {audience.targetGroupLabels.map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl"
                  >
                    {label}
                  </span>
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
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
              Task Description
            </p>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>
          </div>

          {job.selectionCriteria?.trim() && (
            <div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
                What we look for
              </p>
              <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                {job.selectionCriteria}
              </div>
            </div>
          )}

          {(job.requiredSkills || []).length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
                Required Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {(job.requiredSkills || []).map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(job.attachments || []).length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-2">
                Attachments
              </p>
              <div className="space-y-2">
                {(job.attachments || []).map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">
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
