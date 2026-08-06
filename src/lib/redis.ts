import Redis from "ioredis";

let redis: Redis | null = null;
let warnedMissingUrl = false;
let connecting: Promise<void> | null = null;

async function ensureConnected(client: Redis): Promise<void> {
  if (client.status === "ready") return;
  if (!connecting) {
    connecting = client
      .connect()
      .catch((err) => {
        console.error("[catalog-cache] Redis connect failed:", err);
      })
      .finally(() => {
        connecting = null;
      });
  }
  await connecting;
}

export const getRedis = (): Redis | null => {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (!warnedMissingUrl) {
      console.warn(
        "[catalog-cache] REDIS_URL unset — catalog Redis cache disabled"
      );
      warnedMissingUrl = true;
    }
    return null;
  }

  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on("error", (err) => {
      console.error("[catalog-cache] Redis error:", err.message);
    });
  }

  return redis;
};

export const withRedis = async <T>(
  fn: (client: Redis) => Promise<T>
): Promise<T | null> => {
  const client = getRedis();
  if (!client) return null;

  try {
    await ensureConnected(client);
    if (client.status !== "ready") return null;
    return await fn(client);
  } catch (err) {
    console.error("[catalog-cache] Redis operation failed:", err);
    return null;
  }
};
