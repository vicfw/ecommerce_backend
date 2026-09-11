import { eq } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { siteSettingsTable } from "../db/schema/siteSettings";
import { CATALOG_TTL_SECONDS, catalogTags } from "../constants/catalogCache";
import { withRedis } from "../lib/redis";
import { cacheGetOrSet, cacheSet } from "../utils/catalogCache";
import { revalidateStorefront } from "../utils/revalidateStorefront";

const SITE_SETTINGS_CACHE_KEY = "site-settings:content";

const emptySettings = () => ({
  siteName: "",
  logoUrl: null as string | null,
  logoAlt: null as string | null,
  faviconUrl: null as string | null,
});

const ensureSiteSettingsRow = async () => {
  const [existing] = await db.select().from(siteSettingsTable).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(siteSettingsTable)
    .values(emptySettings())
    .returning();

  return created;
};

const normalizeOptionalText = (value: string | null | undefined) => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const siteSettingsPayload = (row: {
  id: number;
  siteName: string;
  logoUrl: string | null;
  logoAlt: string | null;
  faviconUrl: string | null;
  updatedAt: Date | null;
}) => ({
  success: true as const,
  data: {
    id: row.id,
    siteName: row.siteName,
    logoUrl: row.logoUrl,
    logoAlt: row.logoAlt,
    faviconUrl: row.faviconUrl,
    updatedAt: row.updatedAt,
  },
  message: "Site settings retrieved successfully.",
});

export const getSiteSettings = async (c: Context) => {
  const payload = await cacheGetOrSet(
    SITE_SETTINGS_CACHE_KEY,
    async () => siteSettingsPayload(await ensureSiteSettingsRow()),
    CATALOG_TTL_SECONDS
  );

  return c.json(payload);
};

export const getSiteSettingsAdmin = async (c: Context) => {
  const row = await ensureSiteSettingsRow();
  return c.json(siteSettingsPayload(row));
};

export const updateSiteSettings = async (c: Context) => {
  const body = await c.req.json();
  const row = await ensureSiteSettingsRow();

  const [updated] = await db
    .update(siteSettingsTable)
    .set({
      siteName: typeof body.siteName === "string" ? body.siteName.trim() : "",
      logoUrl: normalizeOptionalText(body.logoUrl),
      logoAlt: normalizeOptionalText(body.logoAlt),
      faviconUrl: normalizeOptionalText(body.faviconUrl),
      updatedAt: new Date(),
    })
    .where(eq(siteSettingsTable.id, row.id))
    .returning();

  await withRedis(async (client) => {
    await client.del(SITE_SETTINGS_CACHE_KEY);
    return true;
  });

  const payload = {
    ...siteSettingsPayload(updated),
    message: "Site settings updated successfully.",
  };

  await cacheSet(SITE_SETTINGS_CACHE_KEY, payload, CATALOG_TTL_SECONDS);

  revalidateStorefront({
    tags: [catalogTags.siteSettings],
  });

  return c.json(payload);
};
