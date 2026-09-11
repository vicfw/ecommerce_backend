import { eq } from "drizzle-orm";
import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { Jwt } from "hono/utils/jwt";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { getBearerToken, isTokenBlacklisted } from "../utils/jwtBlacklist";

// Protect Route for Authenticated Users
export const protect = async (c: Context, next: Next) => {
  let token;

  if (
    c.req.header("Authorization") &&
    c.req.header("Authorization")?.startsWith("Bearer")
  ) {
    try {
      token = getBearerToken(c);

      if (!token) {
        return c.json({ message: "Not authorized to access this route" });
      }

      const decoded = await Jwt.verify(token, Bun.env.JWT_SECRET || "");

      if (await isTokenBlacklisted(token)) {
        throw new HTTPException(403, {
          message: "Invalid token! You are not authorized!",
        });
      }
      const id = (decoded as { id: string }).id;

      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, +id),
      });

      if (!user) {
        throw new HTTPException(403, {
          message: "Invalid token! You are not authorized!",
        });
      }

      c.set("user", user);

      await next();
    } catch (err) {
      throw new HTTPException(403, {
        message: "Invalid token! You are not authorized!",
      });
    }
  }

  if (!token) {
    throw new HTTPException(403, {
      message: "Not authorized! No token found!",
    });
  }
};
// Check if user is admin
export const isAdmin = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (user && user.isAdmin) {
    await next();
  } else {
    throw new HTTPException(403, { message: "Not authorized as an admin!" });
  }
};

export const anonProtect = async (c: Context, next: Next) => {
  let { anoncartid = 0 } = await c.req.header();

  if (!anoncartid) {
    throw new HTTPException(401, { message: "anonCartId is not set." });
  }
  await next();
};
