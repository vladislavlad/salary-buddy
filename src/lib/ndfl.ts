import type { TaxBracketBreakdown } from '@/types';

// Конфигурация НДФЛ по годам
interface NdflYearConfig {
  brackets: [threshold: number, rate: number][];
}

function computeBracketTaxes(accumulatedIncome: number, brackets: [number, number][]): TaxBracketBreakdown[] {
  const result: TaxBracketBreakdown[] = [];
  let previousThreshold = 0;
  for (const [threshold, rate] of brackets) {
    if (accumulatedIncome <= previousThreshold) break;
    const taxableInBracket = Math.min(accumulatedIncome, threshold) - previousThreshold;
    result.push({ rate: rate * 100, amount: Math.round(taxableInBracket * rate) });
    previousThreshold = threshold;
  }
  return result;
}

const NDFL_PROGRESSIVE_1: NdflYearConfig = {
  brackets: [
    [5_000_000, 0.13],
    [Infinity, 0.15],
  ],
};

const NDFL_PROGRESSIVE_2: NdflYearConfig = {
  brackets: [
    [2_400_000, 0.13],
    [5_000_000, 0.15],
    [20_000_000, 0.18],
    [50_000_000, 0.20],
    [Infinity, 0.22],
  ],
};

const NDFL_CONFIGS: Record<number, NdflYearConfig> = {
  2023: NDFL_PROGRESSIVE_1,
  2024: NDFL_PROGRESSIVE_1,
  2025: NDFL_PROGRESSIVE_2,
  2026: NDFL_PROGRESSIVE_2,
};

function getNdflConfig(year: number): NdflYearConfig {
  return NDFL_CONFIGS[year] ?? NDFL_PROGRESSIVE_2;
}

export function calculateNdflForPayment(
  paymentGross: number,
  previousAccumulatedIncome: number,
  year: number
): { ndfl: number; newAccumulatedIncome: number; newTotalTax: number; breakdown: TaxBracketBreakdown[] } {
  const config = getNdflConfig(year);
  const TAX_BRACKETS = config.brackets;

  const newAccumulatedIncome = previousAccumulatedIncome + paymentGross;

  // Считаем НДФЛ по каждому диапазону для нового и предыдущего накопленного дохода
  const newBracketTaxes = computeBracketTaxes(newAccumulatedIncome, TAX_BRACKETS);
  const prevBracketTaxes = computeBracketTaxes(previousAccumulatedIncome, TAX_BRACKETS);
  const totalNewTax = newBracketTaxes.reduce((sum, b) => sum + b.amount, 0);

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

  // НДФЛ именно с этой выплаты = сумма по всем ставкам из breakdown
  const ndflForPayment = breakdown.reduce((sum, b) => sum + b.amount, 0);

  return {
    ndfl: ndflForPayment,
    newAccumulatedIncome,
    newTotalTax: totalNewTax,
    breakdown,
  };
}
