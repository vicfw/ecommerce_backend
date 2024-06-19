import { Product } from "@prisma/client";

export type ProductQueryStringType = {
  page?: string;
  limit?: string;
};

export type ProductWithoutId = Omit<Product, "id">;
