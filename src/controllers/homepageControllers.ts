import { eq } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import {
  emptyHomepageLayout,
  homepageTable,
  normalizeHomepageLayout,
  type HomepageLayout,
} from "../db/schema/homepage";
import { CATALOG_TTL_SECONDS } from "../constants/catalogCache";
import { withRedis } from "../lib/redis";
import {
  cacheGetOrSet,
  cacheSet,
} from "../utils/catalogCache";
import { revalidateStorefront } from "../utils/revalidateStorefront";

const HOMEPAGE_CACHE_KEY = "homepage:content";

const ensureHomepageRow = async () => {
  const [existing] = await db.select().from(homepageTable).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(homepageTable)
    .values({ sections: emptyHomepageLayout() })
    .returning();

  return created;
};

const homepagePayload = (row: {
  id: number;
  sections: unknown;
  updatedAt: Date | null;
}) => ({
  success: true as const,
  data: {
    id: row.id,
    sections: normalizeHomepageLayout(row.sections),
    updatedAt: row.updatedAt,
  },
  message: "Homepage retrieved successfully.",
});

export const getHomepage = async (c: Context) => {
  const payload = await cacheGetOrSet(
    HOMEPAGE_CACHE_KEY,
    async () => homepagePayload(await ensureHomepageRow()),
    CATALOG_TTL_SECONDS
  );

  // Re-normalize in case cache still holds a legacy flat sections array.
  if (payload?.data) {
    payload.data.sections = normalizeHomepageLayout(payload.data.sections);
  }

  return c.json(payload);
};

export const getHomepageAdmin = async (c: Context) => {
  const row = await ensureHomepageRow();
  return c.json(homepagePayload(row));
};

export const updateHomepage = async (c: Context) => {
  const body = await c.req.json();
  const layout: HomepageLayout = {
    desktop: body.desktop ?? [],
    mobile: body.mobile ?? [],
  };
  const row = await ensureHomepageRow();

  const [updated] = await db
    .update(homepageTable)
    .set({
      sections: layout,
      updatedAt: new Date(),
    })
    .where(eq(homepageTable.id, row.id))
    .returning();

  await withRedis(async (client) => {
    await client.del(HOMEPAGE_CACHE_KEY);
    return true;
  });

  const payload = {
    ...homepagePayload(updated),
    message: "Homepage updated successfully.",
  };

  await cacheSet(HOMEPAGE_CACHE_KEY, payload, CATALOG_TTL_SECONDS);

  revalidateStorefront({
    tags: ["homepage"],
    paths: ["/"],
  });

  return c.json(payload);
};
