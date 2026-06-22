import type { NdfResult } from '@/types';

// Прогрессивная шкала НДФЛ 2026 (РФ)
const TAX_BRACKETS: [number, number][] = [
  [2_400_000, 0.13],
  [5_000_000, 0.15],
  [20_000_000, 0.18],
  [50_000_000, 0.20],
  [Infinity, 0.22],
];

/**
 * Рассчитывает НДФЛ по прогрессивной шкале от накопленного дохода с начала года.
 * Ставка применяется только к сумме превышения порога.
 */
export function calculateNdfl(accumulatedIncome: number): NdfResult {
  if (accumulatedIncome <= 0) {
    return { tax: 0, effectiveRate: 0 };
  }

  let totalTax = 0;
  let previousThreshold = 0;

  for (const [threshold, rate] of TAX_BRACKETS) {
    if (accumulatedIncome <= previousThreshold) break;

    const taxableInBracket = Math.min(accumulatedIncome, threshold) - previousThreshold;
    totalTax += taxableInBracket * rate;
    previousThreshold = threshold;
  }

  return {
    tax: totalTax,
    effectiveRate: (totalTax / accumulatedIncome) * 100,
  };
}

/**
 * Рассчитывает НДФЛ для конкретной выплаты.
 * Учитывает накопленный доход до этой выплаты и уже уплаченный налог.
 */
export function calculateNdflForPayment(
  paymentGross: number,
  previousAccumulatedIncome: number,
  previousTaxPaid: number
): { ndfl: number; newAccumulatedIncome: number; newTotalTax: number } {
  const newAccumulatedIncome = previousAccumulatedIncome + paymentGross;

  // НДФЛ от нового накопленного дохода
  const totalNdflResult = calculateNdfl(newAccumulatedIncome);

  // НДФЛ именно с этой выплаты = общий НДФЛ минус уже уплаченный
  const ndflForPayment = Math.max(0, totalNdflResult.tax - previousTaxPaid);

  return {
    ndfl: ndflForPayment,
    newAccumulatedIncome,
    newTotalTax: totalNdflResult.tax,
  };
}
