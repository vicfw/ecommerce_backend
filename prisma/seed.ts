import { PrismaClient } from "@prisma/client";
import {
  address,
  badge,
  category,
  deliveryCost,
  discount,
  productsSeed,
  user,
} from "./data";

const prisma = new PrismaClient();

const main = async () => {
  let createdUser;
  let createdDiscount;
  let createdBadge: number[] = [];

  for (const element of user) {
    createdUser = await prisma.user.create({ data: element });
  }

  // for (const element of discount) {
  //   createdDiscount = await prisma.discount.create({ data: element });
  // }

  for (const element of address) {
    await prisma.address.create({
      data: { ...element, userId: createdUser?.id! },
    });
  }

  for (const element of badge) {
    const badge = await prisma.badge.create({ data: element });
    createdBadge.push(badge.id);
  }

  for (const element of productsSeed) {
    await prisma.product.create({
      data: {
        ...element,
        badges: {
          connect: createdBadge?.map((badgeId) => ({
            id: Number(badgeId),
          })),
        },
      },
    });
  }

  await prisma.deliveryCost.create({
    data: {
      cost: deliveryCost.cost,
    },
  });
};

main()
  .then(() => console.log("seed done"))
  .catch((err) => {
    console.log(err);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
