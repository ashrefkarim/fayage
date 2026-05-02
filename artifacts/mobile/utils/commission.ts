// Flat commission rate: 5% on all orders regardless of weight

/**
 * Format a weight stored in kg back to a human-readable string.
 * Values >= 1000 kg are displayed in tonnes (tn) for readability.
 */
export function formatWeight(weightKg: number): string {
  if (weightKg >= 1000) {
    const tn = weightKg / 1000;
    return `${tn % 1 === 0 ? tn : parseFloat(tn.toFixed(2))} tn`;
  }
  return `${weightKg} kg`;
}

export interface CommissionResult {
  rate: number;
  commission: number;
  earning: number;
}

export function getCommissionRate(_weightKg: number): number {
  return 5;
}

export function calculateDriverEarning(
  price: number,
  weightKg: number
): CommissionResult {
  const rate = getCommissionRate(weightKg);
  const commission = Math.round((price * rate) / 100);
  const earning = Math.round(price - commission);
  return { rate, commission, earning };
}
