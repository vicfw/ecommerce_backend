import { Product } from "@prisma/client";

export type ProductQueryStringType = {
  page?: string;
  limit?: string;
  categoryId?: string;
};

export type ProductWithoutId = Omit<Product, "id">;
