import { Meilisearch } from "meilisearch";

const host = process.env.MEILI_HOST?.trim();
const apiKey = process.env.MEILI_MASTER_KEY?.trim();

let client: Meilisearch | null | undefined;

export const isMeiliConfigured = () => Boolean(host);

export const getMeiliClient = (): Meilisearch | null => {
  if (!host) return null;

  if (client === undefined) {
    client = new Meilisearch({
      host,
      ...(apiKey ? { apiKey } : {}),
    });
  }

  return client;
};
