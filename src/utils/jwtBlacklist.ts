import { createHash } from "node:crypto";
import { Context } from "hono";
import { withRedis } from "../lib/redis";

export const getBearerToken = (c: Context) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer")) return "";
  return header.replace(/Bearer\s+/i, "").trim();
};

const blacklistKey = (token: string) =>
  `jwt:blacklist:${createHash("sha256").update(token).digest("hex")}`;

const remainingTtlSeconds = (expSeconds: number) =>
  Math.max(expSeconds - Math.floor(Date.now() / 1000), 1);

export const blacklistToken = async (token: string, expSeconds: number) => {
  if (!token) return;

  await withRedis((client) =>
    client.set(blacklistKey(token), "1", "EX", remainingTtlSeconds(expSeconds))
  );
};

export const isTokenBlacklisted = async (token: string) => {
  if (!token) return false;

  const value = await withRedis((client) => client.get(blacklistKey(token)));
  return value === "1";
};
