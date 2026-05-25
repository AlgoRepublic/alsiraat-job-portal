import { useEffect, useState, useCallback, useMemo } from "react";
import {
  formatTaskRewardDisplay,
  findRewardTypeInCatalog,
  resolveConfigForRewardTypeName,
  type RewardTypeRecord,
  type TaskRewardFields,
} from "../utils/rewardType";
import {
  getCachedRewardTypesCatalog,
  loadRewardTypesCatalog,
  subscribeRewardTypesCatalog,
} from "../services/rewardTypesCatalog";

export function useRewardTypes(organisationId?: string) {
  const [catalog, setCatalog] = useState<RewardTypeRecord[]>(
    () => getCachedRewardTypesCatalog(organisationId) ?? [],
  );
  const [loading, setLoading] = useState(
    () => getCachedRewardTypesCatalog(organisationId) === undefined,
  );

  useEffect(() => {
    let cancelled = false;

    const syncFromCache = () => {
      const cached = getCachedRewardTypesCatalog(organisationId);
      if (cached) {
        setCatalog(cached);
        setLoading(false);
      }
    };

    syncFromCache();
    const unsub = subscribeRewardTypesCatalog(organisationId, () => {
      if (!cancelled) syncFromCache();
    });

    loadRewardTypesCatalog(organisationId)
      .then((types) => {
        if (!cancelled) {
          setCatalog(types);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog(getCachedRewardTypesCatalog(organisationId) ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsub();
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
