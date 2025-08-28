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

export const deleteAddressSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
});

export const deleteAddressBulkSchema = z.object({
  addressIds: z
    .array(z.number().positive())
    .min(1, "At least one address ID is required"),
});

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
  defaultColorImage: z.string(),
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

export const brandSchema = z.object({
  name: z.string(),
  engName: z.string(),
  slug: z.string(),
});

export const partialBrandSchema = brandSchema.partial();

export const commentSchema = z.object({
  userId: z.number(),
  productId: z.number(),
  body: z.string(),
  isApproved: z.boolean().optional(),
  image: z.string(),
});
