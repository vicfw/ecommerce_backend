import { eq } from "drizzle-orm";
import { db } from "..";
import { addressesTable } from "../schema/addresses";
import { badgesTable } from "../schema/badges";
import { badgesToProducts } from "../schema/badgesToProducts";
import { brandsTable } from "../schema/brands";
import { categoriesTable } from "../schema/categories";
import { deliveryCostsTable } from "../schema/deliveryCosts";
import { productsTable } from "../schema/products";
import { usersTable } from "../schema/users";
import { address, badge, deliveryCost, productsSeed, user } from "./data";
import { reindexAllProducts } from "../../search/productIndex";

const main = async () => {
  let createdUserId: number | undefined;
  const createdBadgeIds: number[] = [];

  for (const element of user) {
    const [createdUser] = await db
      .insert(usersTable)
      .values(element)
      .onConflictDoUpdate({
        target: usersTable.phoneNumber,
        set: { isAdmin: element.isAdmin },
      })
      .returning();
    createdUserId = createdUser.id;
  }

  if (createdUserId) {
    for (const element of address) {
      await db
        .insert(addressesTable)
        .values({ ...element, userId: createdUserId });
    }
  }

  const [brand] = await db
    .insert(brandsTable)
    .values({
      name: "عاقله",
      engName: "Aqeleh",
      slug: "aqeleh",
    })
    .returning();

  let [category] = await db
    .insert(categoriesTable)
    .values({
      name: "زعفران",
      slug: "saffron",
      description: "دسته‌بندی زعفران",
      isParent: true,
      parentImage:
        "https://res.cloudinary.com/dfflta8zl/image/upload/v1718792363/6EXuJbahUldCn0l-Z0XT9.webp",
      parentBanner:
        "https://res.cloudinary.com/dfflta8zl/image/upload/v1718792363/6EXuJbahUldCn0l-Z0XT9.webp",
      level: 1,
      isActive: true,
      sortOrder: 0,
    })
    .onConflictDoNothing({ target: categoriesTable.slug })
    .returning();

  if (!category) {
    [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, "saffron"))
      .limit(1);
  }

  if (!category) {
    [category] = await db.select().from(categoriesTable).limit(1);
  }

  if (!category) {
    throw new Error("No category available for seeding products");
  }

  for (const element of badge) {
    const [createdBadge] = await db
      .insert(badgesTable)
      .values(element)
      .onConflictDoNothing({ target: badgesTable.title })
      .returning();
    if (createdBadge) {
      createdBadgeIds.push(createdBadge.id);
    }
  }

  if (createdBadgeIds.length === 0) {
    const [existingBadge] = await db.select().from(badgesTable).limit(1);
    if (existingBadge) {
      createdBadgeIds.push(existingBadge.id);
    }
  }

  for (const element of productsSeed) {
    const defaultColorImage = element.images?.[0] ?? "";
    const [product] = await db
      .insert(productsTable)
      .values({
        ...element,
        categoryId: category.id,
        brandId: brand.id,
        defaultColorImage,
      })
      .returning();

    if (createdBadgeIds[0]) {
      await db.insert(badgesToProducts).values({
        productId: product.id,
        badgeId: createdBadgeIds[0],
      });
    }
  }

  await db.insert(deliveryCostsTable).values({ cost: deliveryCost.cost });

  try {
    await reindexAllProducts();
  } catch (err) {
    console.warn("Meilisearch reindex after seed skipped:", err);
  }
};

main()
  .then(() => {
    console.log("seed done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
