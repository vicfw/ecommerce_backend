import { z } from "zod";

export const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
  zipCode: z.string(),
});

export const addressSchemaPartial = addressSchema.partial();

export const categorySchema = z.object({
  name: z.string(),
  parentId: z.number().optional(),
});

export const colorsSchema = z.object({
  title: z.string(),
  hexCode: z.string(),
});

export const partialColorSchema = colorsSchema.partial();

export const badgesSchema = z.object({
  title: z.string(),
  icon: z.string(),
});

export const partialBadgeSchema = colorsSchema.partial();

export const productSchema = z.object({
  name: z.string({ required_error: "Name is Required" }).trim(),
  price: z.number(),
  description: z.string(),
  quantity: z.number(),
  categoryId: z.number(),
  images: z.array(z.string()),
  colors: z.array(z.number()).optional(),
  badges: z.array(z.number()).optional(),
});

export const partialProductSchema = productSchema.partial();

export const cartSchema = z.object({
  increment: z.boolean(),
  productId: z.number(),
});

export const anonCartSchema = z.object({
  increment: z.boolean(),
  productId: z.number(),
  uuid: z.string().optional(),
});

export const anonCartMatchSchema = z.object({
  userId: z.number(),
});
