import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { getLogger } from "hono-pino";
import { logger as rootLogger } from "../lib/logger";

type DatabaseError = {
  code: string;
  message: string;
  detail?: string;
  constraint?: string;
  column?: string;
};

const reqLogger = (c: Context) => getLogger(c) ?? rootLogger;

// Error Handler
export const errorHandler = (c: Context) => {
  const err = c.error;
  const log = reqLogger(c);

  // Handle HTTP Exceptions
  if (err instanceof HTTPException) {
    if (err.status >= 500) {
      log.error({ err, status: err.status }, err.message);
    }

    const errorData = {
      success: false,
      message: err.message,
      cause: err.cause,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    };
    return c.json(errorData, err.status);
  }

  // Handle Database Errors
  if (err instanceof Error && "code" in err) {
    const dbError = err as unknown as DatabaseError;

    // Unique constraint violation
    if (dbError.code === "23505") {
      const field = dbError.constraint?.split("_")[1] || "field";
      return c.json(
        {
          success: false,
          message: `This ${field} is already taken`,
          cause: "unique_violation",
        },
        409
      );
    }

    // Foreign key violation
    if (dbError.code === "23503") {
      return c.json(
        {
          success: false,
          message: "Referenced record does not exist",
          cause: "foreign_key_violation",
        },
        400
      );
    }

    // Not null violation
    if (dbError.code === "23502") {
      const field = dbError.column || "field";
      return c.json(
        {
          success: false,
          message: `${field} is required`,
          cause: "not_null_violation",
        },
        400
      );
    }

    // Check constraint violation
    if (dbError.code === "23514") {
      return c.json(
        {
          success: false,
          message: dbError.message || "Invalid data provided",
          cause: "check_violation",
        },
        400
      );
    }

    log.error(
      {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
      },
      "database_error"
    );

    return c.json(
      {
        success: false,
        message: "Database error occurred",
        cause: "database_error",
      },
      500
    );
  }

  log.error({ err }, "unexpected_error");
  return c.json(
    {
      success: false,
      message: "An unexpected error occurred",
      cause: "unexpected_error",
    },
    500
  );
};

// Not Found Handler
export const notFound = (c: Context) => {
  return c.json(
    {
      success: false,
      message: `Not Found - [${c.req.method}] ${c.req.url}`,
    },
    404
  );
};
