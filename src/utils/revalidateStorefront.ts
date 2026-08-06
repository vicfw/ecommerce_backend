type RevalidatePayload = {
  tags?: string[];
  paths?: string[];
};

let warnedMissingConfig = false;

/**
 * Fire-and-forget Next.js on-demand revalidation.
 * Call only AFTER Redis catalog invalidation.
 */
export function revalidateStorefront(payload: RevalidatePayload): void {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!frontendUrl || !secret) {
    if (!warnedMissingConfig) {
      console.warn(
        "[catalog-cache] FRONTEND_URL or REVALIDATE_SECRET unset — storefront revalidate skipped"
      );
      warnedMissingConfig = true;
    }
    return;
  }

  const url = `${frontendUrl.replace(/\/$/, "")}/api/revalidate`;

  void fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error("[catalog-cache] storefront revalidate failed:", err);
  });
}
