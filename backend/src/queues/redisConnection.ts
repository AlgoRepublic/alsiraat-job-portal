import { Redis } from "ioredis";

/**
 * BullMQ requires maxRetriesPerRequest: null on the ioredis client.
 * @see https://docs.bullmq.io/guide/connections
 */
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return new Redis(url, { maxRetriesPerRequest: null });
}
