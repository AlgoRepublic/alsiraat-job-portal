import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "../services/database";
import {
  formatTaskRewardDisplay,
  findRewardTypeInCatalog,
  resolveConfigForRewardTypeName,
  type RewardTypeRecord,
  type TaskRewardFields,
} from "../utils/rewardType";

export function useRewardTypes(organisationId?: string) {
  const [catalog, setCatalog] = useState<RewardTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    db.getRewardTypes(organisationId)
      .then((types) => {
        if (!cancelled) {
          setCatalog(Array.isArray(types) ? types : []);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const formatReward = useCallback(
    (task: TaskRewardFields) => formatTaskRewardDisplay(task, catalog),
    [catalog],
  );

  const findByName = useCallback(
    (rewardType: string) => findRewardTypeInCatalog(catalog, rewardType),
    [catalog],
  );

  const resolveConfig = useCallback(
    (rewardTypeName: string) =>
      resolveConfigForRewardTypeName(rewardTypeName, catalog),
    [catalog],
  );

  return useMemo(
    () => ({
      catalog,
      loading,
      formatReward,
      findByName,
      resolveConfig,
    }),
    [catalog, loading, formatReward, findByName, resolveConfig],
  );
}
