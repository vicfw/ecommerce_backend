import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// Error Handler
export const errorHandler = (c: Context) => {
  const err = c.error;
  if (err instanceof HTTPException) {
    const errorData = {
      success: false,
      message: c.error?.message,
      stack: process.env.NODE_ENV === "production" ? null : c.error?.stack,
      cause: c.error?.cause,
    };
    return c.json(errorData, err.status); // Send custom JSON with status code
  } else {
    console.log("error:", err);

    const errorData = {
      message: "An unexpected error occurred!",
      code: 500,
    };
    return c.json(errorData, 500);
  }
};

// Not Found Handler
export const notFound = (c: Context) => {
  return c.json({
    success: false,
    message: `Not Found - [${c.req.method}] ${c.req.url}`,
  });
};
