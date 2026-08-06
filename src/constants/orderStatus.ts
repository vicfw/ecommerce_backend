export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "returned",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const isOrderStatus = (value: string): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

export const REVENUE_STATUSES: OrderStatus[] = [
  "processing",
  "shipped",
  "delivered",
];

export const emptyOrdersByStatus = (): Record<OrderStatus, number> =>
  ORDER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );
