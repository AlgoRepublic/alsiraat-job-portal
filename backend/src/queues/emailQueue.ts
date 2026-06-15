import { Redis } from "ioredis";
import { Queue } from "bullmq";
import type { EmailTemplate } from "../services/emailTemplates.js";
import { createRedisConnection } from "./redisConnection.js";
import { logger } from "../utils/logger.js";

export const EMAIL_QUEUE_NAME = "emails";

export interface EmailJobPayload {
  toEmail: string;
  template: EmailTemplate;
  organisationId?: string | null;
}

let queueInstance: Queue<EmailJobPayload> | null = null;
let queueConnection: Redis | null = null;

function getEmailQueue(): Queue<EmailJobPayload> {
  if (!queueInstance) {
    queueConnection = createRedisConnection();
    queueInstance = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return queueInstance;
}

export function isEmailQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/**
 * Enqueue a send-email job. Resolves when the job is persisted in Redis (not when mail is sent).
 * @throws If REDIS_URL is not set or Redis is unavailable
 */
export async function enqueueEmail(payload: EmailJobPayload): Promise<void> {
  await getEmailQueue().add("send", payload);
}

export async function closeEmailQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
  }
  logger.info("Email queue closed");
}
