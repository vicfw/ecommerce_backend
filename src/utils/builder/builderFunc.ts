import { ProductTypes } from "../../types";

export const productQueryStringBuilder = (
  query: ProductTypes.ProductQueryStringType
) => {
  const {} = query;
  const queryString: Record<string, any> = {};

  return queryString;
};

export const paginationBuilder = (
  query: ProductTypes.ProductQueryStringType & {
    perPage?: string | number;
    limit?: string | number;
    page?: string | number;
  }
) => {
  const page = +(query.page ?? 1);
  const limit = +(query.perPage ?? query.limit ?? 9999999999);

  const pagination: Record<string, number> = {};

  pagination.skip = page > 1 ? (page - 1) * limit : 0;
  pagination.limit = limit;
  pagination.page = page;

  return pagination;
};

export const paginatedResponseBuilder = (
  data: any,
  message: string,
  total: number,
  page: number,
  hasMore: boolean,
  success: boolean
) => {
  return {
    success,
    data,
    message,
    total,
    page,
    hasMore,
  };
};
