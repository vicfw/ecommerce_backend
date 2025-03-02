import { Context } from "hono";
import { db } from "../db";
import { colorImagesTable } from "../db/schema/colorImage";

export const createColorImage = async (c: Context) => {
  const body = await c.req.json();

  const [colorImage] = await db
    .insert(colorImagesTable)
    .values({
      colorImage: body.colorImage,
      images: body.images,
      productId: body.productId,
    })
    .returning();

  return c.json({
    success: true,
    data: colorImage,
    message: "Color image created successfully.",
  });
};
