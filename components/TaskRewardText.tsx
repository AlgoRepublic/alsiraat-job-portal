import React from "react";
import { useRewardTypes } from "../hooks/useRewardTypes";
import {
  formatTaskRewardDisplay,
  type RewardTypeRecord,
  type TaskRewardFields,
} from "../utils/rewardType";

type TaskRewardTextProps = {
  task: TaskRewardFields;
  /** Organisation that owns the task (preferred for catalogue lookup). */
  organisationId?: string;
  /** Pre-loaded catalogue — use on list pages to avoid per-row fetches. */
  catalog?: RewardTypeRecord[];
  className?: string;
};

type TaskRewardTextContentProps = {
  task: TaskRewardFields;
  catalog: RewardTypeRecord[];
  className?: string;
};

const TaskRewardTextContent: React.FC<TaskRewardTextContentProps> = ({
  task,
  catalog,
  className,
}) => {
  if (!task.rewardType?.trim()) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={className}>
      {formatTaskRewardDisplay(task, catalog)}
    </span>
  );
};

const TaskRewardTextWithCatalog: React.FC<
  Omit<TaskRewardTextProps, "catalog">
> = ({ task, organisationId, className }) => {
  const { catalog, loading } = useRewardTypes(organisationId);

  if (!task.rewardType?.trim()) {
    return <span className={className}>—</span>;
  }

  if (loading && catalog.length === 0) {
    return <span className={className}>{task.rewardType}</span>;
  }

  return (
    <TaskRewardTextContent task={task} catalog={catalog} className={className} />
  );
};

/**
 * Renders a formatted reward string from task fields + reward-type catalogue.
 */
export const TaskRewardText: React.FC<TaskRewardTextProps> = ({
  task,
  organisationId,
  catalog: catalogProp,
  className,
}) => {
  if (catalogProp) {
    return (
      <TaskRewardTextContent
        task={task}
        catalog={catalogProp}
        className={className}
      />
    );
  }

  return (
    <TaskRewardTextWithCatalog
      task={task}
      organisationId={organisationId}
      className={className}
    />
  );
};
