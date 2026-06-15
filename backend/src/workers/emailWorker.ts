import { Redis } from "ioredis";
import { Worker, type Job } from "bullmq";
import { EMAIL_QUEUE_NAME, type EmailJobPayload } from "../queues/emailQueue.js";
import { createRedisConnection } from "../queues/redisConnection.js";
import { sendEmail } from "../services/notificationService.js";
import { logger } from "../utils/logger.js";

let worker: Worker<EmailJobPayload> | null = null;
let workerConnection: Redis | null = null;

export function startEmailWorker(): void {
  if (worker) return;
  workerConnection = createRedisConnection();
  worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      await sendEmail(job.data.toEmail, job.data.template, {
        organisationId: job.data.organisationId ?? null,
        skipQueue: true,
      });
    },
    {
      connection: workerConnection,
      concurrency: 5,
      lockDuration: 120_000,
    },
  );
  worker.on("failed", (job, err) => {
    logger.error("Email job failed", {
      jobId: job?.id,
      message: err instanceof Error ? err.message : String(err),
    });
  });
  logger.info("Email worker started", { queue: EMAIL_QUEUE_NAME });
}

export async function stopEmailWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = null;
  }
}
