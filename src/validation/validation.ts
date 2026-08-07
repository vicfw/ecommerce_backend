import { z } from "zod";
import { ORDER_STATUSES } from "../constants/orderStatus";

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

// Parent category schema (level 1)
export const parentCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  parentImage: z.string().optional(),
  parentBanner: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// Child category schema (level 2)
export const childCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  parentId: z.number().positive("Valid parent ID is required"),
  image: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// Subchild category schema (level 3)
export const subchildCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  parentId: z.number().positive("Valid parent ID is required"),
  image: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  parentImage: z.string().optional(),
  parentBanner: z.string().optional(),
  image: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const updateUserAdminSchema = z.object({
  isAdmin: z.boolean().optional(),
  point: z.number().int().min(0).optional(),
});

export const adminLoginSchema = z.object({
  phoneNumber: z.string().min(1),
  code: z.string().length(4),
});

export const adminRequestOtpSchema = z.object({
  phoneNumber: z.string().min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
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

export const partialBadgeSchema = badgesSchema.partial();

export const productSchema = z.object({
  prName: z.string().min(1),
  enName: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  images: z.array(z.string()).min(1, "At least one image is required"),
  badges: z.array(z.number()).optional(),
  weight: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().nullish(),
  colorImageIds: z.array(z.number().int().positive()).optional(),
  defaultColorImage: z.string().optional(),
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

export const colorImageSchema = z.object({
  name: z.string().min(1),
  colorImage: z.string().min(1),
  images: z.array(z.string()).min(1, "At least one image is required"),
  productId: z.number().int().positive().nullish(),
});

export const partialColorImageSchema = colorImageSchema.partial();

export const commentSchema = z.object({
  userId: z.number(),
  productId: z.number(),
  body: z.string(),
  isApproved: z.boolean().optional(),
  image: z.string(),
});

export const homepageBannerSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("banner"),
  imageUrl: z.string().min(1),
  href: z.string().optional(),
  alt: z.string().optional(),
});

export const homepageProductSliderSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("product_slider"),
  title: z.string().min(1),
  productIds: z.array(z.number().int().positive()),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const homepageStoryLinkItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
});

export const homepageStoryLinksSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("story_links"),
  items: z.array(homepageStoryLinkItemSchema).min(1),
});

export const homepageImageSlideSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  href: z.string().optional(),
  alt: z.string().optional(),
});

export const homepageImageSliderSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image_slider"),
  slides: z.array(homepageImageSlideSchema).min(1),
});

export const homepageContentBlockSchema = z.discriminatedUnion("type", [
  homepageBannerSectionSchema,
  homepageProductSliderSectionSchema,
]);

export const homepageRowSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("row"),
  columns: z.array(homepageContentBlockSchema).min(1).max(4),
});

export const homepageSectionSchema = z.discriminatedUnion("type", [
  homepageBannerSectionSchema,
  homepageProductSliderSectionSchema,
  homepageRowSectionSchema,
  homepageStoryLinksSectionSchema,
  homepageImageSliderSectionSchema,
]);

export const updateHomepageSchema = z.object({
  desktop: z.array(homepageSectionSchema),
  mobile: z.array(homepageSectionSchema),
});

