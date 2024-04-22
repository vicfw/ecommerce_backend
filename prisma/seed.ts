import { PrismaClient } from "@prisma/client";
import { address, badge, category, color, product, user } from "./data";

const prisma = new PrismaClient();

const main = async () => {
  let createdUser;
  let createdCategory;
  let createdColor: number[] = [];
  for (const element of user) {
    createdUser = await prisma.user.create({ data: element });
  }
  for (const element of address) {
    await prisma.address.create({
      data: { ...element, userId: createdUser?.id! },
    });
  }
  for (const element of category) {
    createdCategory = await prisma.category.create({ data: element });
  }
  for (const element of color) {
    const color = await prisma.color.create({ data: element });
    createdColor.push(color.id);
  }
  for (const element of badge) {
    await prisma.badge.create({ data: element });
  }
  for (const element of product) {
    await prisma.product.create({
      data: {
        ...element,
        categoryId: createdCategory?.id!,
        colors: {
          connect: createdColor?.map((colorId) => ({
            id: Number(colorId),
          })),
        },
      },
    });
  }
};

main()
  .catch((err) => {
    console.log(err);
    process.exit(0);
  })
  .finally(() => prisma.$disconnect());
