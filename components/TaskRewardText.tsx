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

/**
 * Renders a formatted reward string from task fields + reward-type catalogue.
 */
export const TaskRewardText: React.FC<TaskRewardTextProps> = ({
  task,
  organisationId,
  catalog: catalogProp,
  className,
}) => {
  const { catalog: loadedCatalog, loading } = useRewardTypes(
    catalogProp ? undefined : organisationId,
  );
  const catalog = catalogProp ?? loadedCatalog;

  if (!task.rewardType?.trim()) {
    return <span className={className}>—</span>;
  }

  if (!catalogProp && loading && catalog.length === 0) {
    return <span className={className}>{task.rewardType}</span>;
  }

  return (
    <span className={className}>
      {formatTaskRewardDisplay(task, catalog)}
    </span>
  );
};
