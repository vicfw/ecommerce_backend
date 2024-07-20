export function calculateProfit(
  originalPrice: number,
  discountRate: number
): number {
  if (!discountRate) return 0;

  return originalPrice * (discountRate / 100);
}
