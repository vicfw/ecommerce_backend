import "dotenv/config";
import { reindexAllProducts } from "./productIndex";

try {
  const result = await reindexAllProducts();

  if (result.skipped) {
    console.log("Meilisearch is not configured; skipped product reindex.");
    process.exit(0);
  }

  console.log(`Indexed ${result.indexed} products.`);
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
