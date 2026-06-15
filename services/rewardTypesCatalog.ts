import { db } from "./database";
import type { RewardTypeRecord } from "../utils/rewardType";

function cacheKey(organisationId?: string): string {
  return organisationId ?? "";
}

type CacheEntry = {
  data: RewardTypeRecord[];
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<RewardTypeRecord[]>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/** Drop cached catalogue for an org (or all orgs if omitted). */
export function invalidateRewardTypesCatalog(organisationId?: string): void {
  if (organisationId === undefined) {
    cache.clear();
    inflight.clear();
    listeners.forEach((set) => set.forEach((fn) => fn()));
    return;
  }
  const key = cacheKey(organisationId);
  cache.delete(key);
  inflight.delete(key);
  notify(key);
}

export function subscribeRewardTypesCatalog(
  organisationId: string | undefined,
  onChange: () => void,
): () => void {
  const key = cacheKey(organisationId);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(onChange);
  return () => listeners.get(key)?.delete(onChange);
}

export function getCachedRewardTypesCatalog(
  organisationId?: string,
): RewardTypeRecord[] | undefined {
  return cache.get(cacheKey(organisationId))?.data;
}

/**
 * Loads active + inactive reward types once per organisation scope.
 * Concurrent callers share the same in-flight request.
 */
export async function loadRewardTypesCatalog(
  organisationId?: string,
  options?: { force?: boolean },
): Promise<RewardTypeRecord[]> {
  const key = cacheKey(organisationId);

  if (!options?.force) {
    const hit = cache.get(key);
    if (hit) return hit.data;
    const pending = inflight.get(key);
    if (pending) return pending;
  } else {
    cache.delete(key);
    inflight.delete(key);
  }

  const promise = db
    .getRewardTypesAdmin(organisationId)
    .then((types) => {
      const data = (Array.isArray(types) ? types : []) as RewardTypeRecord[];
      cache.set(key, { data });
      inflight.delete(key);
      notify(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
