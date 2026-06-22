import type { NdfResult, TaxBracketBreakdown } from '@/types';

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
 * Рассчитывает НДФЛ для конкретной выплаты с разбивкой по ставкам.
 */
export function calculateNdflForPayment(
  paymentGross: number,
  previousAccumulatedIncome: number,
  previousTaxPaid: number
): { ndfl: number; newAccumulatedIncome: number; newTotalTax: number; breakdown: TaxBracketBreakdown[] } {
  const newAccumulatedIncome = previousAccumulatedIncome + paymentGross;

  // Считаем НДФЛ по каждому диапазону для нового накопленного дохода
  let totalNewTax = 0;
  let previousThreshold = 0;
  const newBracketTaxes: TaxBracketBreakdown[] = [];

  for (const [threshold, rate] of TAX_BRACKETS) {
    if (newAccumulatedIncome <= previousThreshold) break;

    const taxableInBracket = Math.min(newAccumulatedIncome, threshold) - previousThreshold;
    const taxInBracket = taxableInBracket * rate;
    totalNewTax += taxInBracket;
    newBracketTaxes.push({ rate: rate * 100, amount: taxInBracket });
    previousThreshold = threshold;
  }

  // Считаем НДФЛ по каждому диапазону для предыдущего накопленного дохода
  let prevTotalTax = 0;
  previousThreshold = 0;
  const prevBracketTaxes: TaxBracketBreakdown[] = [];

  for (const [threshold, rate] of TAX_BRACKETS) {
    if (previousAccumulatedIncome <= previousThreshold) break;

    const taxableInBracket = Math.min(previousAccumulatedIncome, threshold) - previousThreshold;
    const taxInBracket = taxableInBracket * rate;
    prevTotalTax += taxInBracket;
    prevBracketTaxes.push({ rate: rate * 100, amount: taxInBracket });
    previousThreshold = threshold;
  }

  // Разница по каждой ставке — это НДФЛ именно с этой выплаты
  const allRates = new Set<number>();
  for (const b of newBracketTaxes) allRates.add(b.rate);
  for (const b of prevBracketTaxes) allRates.add(b.rate);

  const breakdown: TaxBracketBreakdown[] = [];
  for (const rate of [...allRates].sort((a, b) => a - b)) {
    const newAmount = newBracketTaxes.find((b) => b.rate === rate)?.amount ?? 0;
    const prevAmount = prevBracketTaxes.find((b) => b.rate === rate)?.amount ?? 0;
    const diff = Math.max(0, newAmount - prevAmount);
    if (diff > 0) {
      breakdown.push({ rate, amount: diff });
    }
  }

  // НДФЛ именно с этой выплаты = общий НДФЛ минус уже уплаченный
  const ndflForPayment = Math.max(0, totalNewTax - previousTaxPaid);

  return {
    ndfl: ndflForPayment,
    newAccumulatedIncome,
    newTotalTax: totalNewTax,
    breakdown,
  };
}
