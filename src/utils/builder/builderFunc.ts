export type PaginationQuery = {
  perPage?: string | number;
  limit?: string | number;
  page?: string | number;
};

export const paginationBuilder = (query: PaginationQuery) => {
  const page = +(query.page ?? 1);
  const limit = +(query.perPage ?? query.limit ?? 9999999999);

  return {
    skip: page > 1 ? (page - 1) * limit : 0,
    limit,
    page,
  };
};

export const paginatedResponseBuilder = (
  data: unknown,
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
