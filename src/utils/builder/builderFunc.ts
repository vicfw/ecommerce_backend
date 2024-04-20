import { ProductTypes } from "../../types";

export const productQueryStringBuilder = (
  query: ProductTypes.ProductQueryStringType
) => {
  const {} = query;
  const queryString: Record<string, any> = {};

  return queryString;
};

export const paginationBuilder = (
  query: ProductTypes.ProductQueryStringType
) => {
  const { page = 1, limit = 9999999999 } = query;

  const pagination: Record<string, number> = {};

  if (page) pagination.skip = +page > 1 ? (+page - 1) * +limit : 0;
  if (limit) pagination.limit = +limit;

  return pagination;
};
