import pino from "pino";

// Single structured logger for the API. JSON in production (log aggregators),
// human-readable single-line output in development, silent under tests.
// Level via LOG_LEVEL (debug/info/warn/error/silent); production default info.
const env = process.env.NODE_ENV;
const level =
  process.env.LOG_LEVEL ?? (env === "test" ? "silent" : env === "production" ? "info" : "debug");

export const logger = pino({
  level,
  ...(env === "production" || env === "test"
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        },
      }),
});
