import { Context } from "hono";
import { db } from "../db";
import { colorImagesTable } from "../db/schema/colorImage";
import { eq } from "drizzle-orm";

export const createColorImage = async (c: Context) => {
  const body = await c.req.json();

  const [colorImage] = await db
    .insert(colorImagesTable)
    .values({
      colorImage: body.colorImage,
      images: body.images,
      productId: body.productId,
      name: body.name,
    })
    .returning();

  return c.json({
    success: true,
    data: colorImage,
    message: "Color image created successfully.",
  });
};

export const updateColorImageProductId = async (c: Context) => {
  const { id } = c.req.param();
  const { productId, name, colorImage } = await c.req.json();

  const [updatedColorImage] = await db
    .update(colorImagesTable)
    .set({
      productId,
      name,
      colorImage,
    })
    .where(eq(colorImagesTable.id, +id))
    .returning();

  if (!updatedColorImage) {
    return c.json(
      {
        success: false,
        message: "Color image not found",
      },
      404
    );
  }

  return c.json({
    success: true,
    data: updatedColorImage,
    message: "Color image updated successfully.",
  });
};
