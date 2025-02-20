import { z } from "zod";

export const addressSchema = z.object({
  address: z.string().min(6).max(100),
  street: z.string(),
  city: z.string(),
  zipCode: z.string().min(10).max(10),
  province: z.string(),
  plate: z.string(),
  floor: z.string().optional(),
  receiverName: z.string(),
  receiverLastName: z.string(),
  receiverPhoneNumber: z.string(),
  isDefault: z.boolean(),
});

export const addressSchemaPartial = addressSchema.partial();

export const categorySchema = z.object({
  name: z.string(),
  image: z.string(),
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
  price: z.number(),
  description: z.string(),
  quantity: z.number(),
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
  anonCartId: z.string().optional(),
});

export const anonCartMatchSchema = z.object({
  userId: z.number(),
});
