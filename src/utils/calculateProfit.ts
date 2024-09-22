export function calculateProfit(
  originalPrice: number,
  discountRate: number
): number {
  if (!discountRate) return 0;

  return originalPrice * (discountRate / 100);
}

export function calculatePriceAfterDiscount(
  originalPrice: number,
  discountRate: number
) {
  if (!discountRate) return originalPrice;
  const profit = originalPrice * (discountRate / 100);

  return originalPrice - profit;
}

export function calculateTotalDiscountPercentage() {}
