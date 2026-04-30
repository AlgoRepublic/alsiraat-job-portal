type LogMeta = Record<string, unknown>;
const isPrettyPrintEnabled = process.env.LOG_PRETTY !== "false";

const write = (level: "info" | "warn" | "error", message: string, meta?: LogMeta) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = isPrettyPrintEnabled
    ? JSON.stringify(payload, null, 2)
    : JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};

