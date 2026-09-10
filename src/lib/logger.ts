import pino from "pino";
import pretty from "pino-pretty";

const isProduction = process.env.NODE_ENV === "production";

const level =
  process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

const options: pino.LoggerOptions = {
  level,
  base: { service: "ecommerce-backend" },
};

export const logger = isProduction
  ? pino(options)
  : pino(
      options,
      pretty({
        colorize: true,
        translateTime: "SYS:standard",
      })
    );
