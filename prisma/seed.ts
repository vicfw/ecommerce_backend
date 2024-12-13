import { PrismaClient } from "@prisma/client";
import { db } from "../src/db";
import { addressesTable } from "../src/db/schema/addresses";
import { usersTable } from "../src/db/schema/users";
import { address, badge, deliveryCost, productsSeed, user } from "./data";
import { badgesTable } from "../src/db/schema/badges";
import { productsTable } from "../src/db/schema/products";
import { badgesToProducts } from "../src/db/schema/badgesToProducts";

const prisma = new PrismaClient();

const main = async () => {
  let createdUser;
  let createdDiscount;
  let createdBadge: number[] = [];

  for (const element of user) {
    const [user] = await db.insert(usersTable).values(element).returning();
    createdUser = user;
  }

  // for (const element of discount) {
  //   createdDiscount = await prisma.discount.create({ data: element });
  // }

  for (const element of address) {
    await db
      .insert(addressesTable)
      .values({ ...element, userId: createdUser?.id! });
  }

  for (const element of badge) {
    const [badge] = await db.insert(badgesTable).values(element).returning();
    createdBadge.push(badge.id);
  }

  for (const element of productsSeed) {
    const [product] = await db
      .insert(productsTable)
      .values(element)
      .returning();
    await db
      .insert(badgesToProducts)
      .values({ productId: product.id, badgeId: createdBadge[0] });
  }

  // await prisma.deliveryCost.create({
  //   data: {
  //     cost: deliveryCost.cost,
  //   },
  // });
};

main()
  .then(() => console.log("seed done"))
  .catch((err) => {
    console.log(err);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
