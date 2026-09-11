export { getMeiliClient, isMeiliConfigured } from "./client";
export { normalizePersianText } from "./normalizePersianText";
export { toProductDocument } from "./productDocument";
export {
  deleteProductDocument,
  ensureProductIndex,
  MEILI_MAX_HITS,
  PRODUCTS_INDEX,
  reindexAllProducts,
  reindexProductsByBrandId,
  reindexProductsByCategoryId,
  searchProductIds,
  upsertProductById,
} from "./productIndex";
