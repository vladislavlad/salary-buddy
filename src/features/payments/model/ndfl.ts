import type { TaxBracketBreakdown } from "@/shared/types";
import { multiplyByPercent } from "@/shared/lib/money";

// Конфигурация НДФЛ по годам — пороги в копейках, ставки в %.
interface NdflYearConfig {
  brackets: [thresholdKop: number, ratePercent: number][];
}

function computeBracketTaxes(
  accumulatedIncomeKop: number,
  brackets: [number, number][],
): TaxBracketBreakdown[] {
  const result: TaxBracketBreakdown[] = [];
  let previousThreshold = 0;
  for (const [threshold, rate] of brackets) {
    if (accumulatedIncomeKop <= previousThreshold) break;
    const taxableInBracket =
      Math.min(accumulatedIncomeKop, threshold) - previousThreshold;
    result.push({ rate, amount: multiplyByPercent(taxableInBracket, rate) });
    previousThreshold = threshold;
  }
  return result;
}

const NDFL_PROGRESSIVE_1: NdflYearConfig = {
  brackets: [
    [500_000_000, 13], // 5 000 000 ₽ в копейках
    [Infinity, 15],
  ],
};

const NDFL_PROGRESSIVE_2: NdflYearConfig = {
  brackets: [
    [240_000_000, 13], // 2 400 000 ₽ в копейках
    [500_000_000, 15], // 5 000 000 ₽ в копейках
    [2_000_000_000, 18], // 20 000 000 ₽ в копейках
    [5_000_000_000, 20], // 50 000 000 ₽ в копейках
    [Infinity, 22],
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
  paymentGrossKop: number,
  previousAccumulatedIncomeKop: number,
  year: number,
): {
  ndfl: number;
  newAccumulatedIncome: number;
  newTotalTax: number;
  breakdown: TaxBracketBreakdown[];
} {
  const config = getNdflConfig(year);
  const TAX_BRACKETS = config.brackets;

  const newAccumulatedIncomeKop =
    previousAccumulatedIncomeKop + paymentGrossKop;

  // Считаем НДФЛ по каждому диапазону для нового и предыдущего накопленного дохода
  const newBracketTaxes = computeBracketTaxes(
    newAccumulatedIncomeKop,
    TAX_BRACKETS,
  );
  const prevBracketTaxes = computeBracketTaxes(
    previousAccumulatedIncomeKop,
    TAX_BRACKETS,
  );
  const totalNewTax = newBracketTaxes.reduce((sum, b) => sum + b.amount, 0);

  // Разница по каждой ставке — это НДФЛ именно с этой выплаты
  const allRates = new Set<number>();
  for (const b of newBracketTaxes) allRates.add(b.rate);
  for (const b of prevBracketTaxes) allRates.add(b.rate);

  const breakdown: TaxBracketBreakdown[] = [];
  for (const rate of [...allRates].sort((a, b) => a - b)) {
    const newAmount = newBracketTaxes.find((b) => b.rate === rate)?.amount ?? 0;
    const prevAmount =
      prevBracketTaxes.find((b) => b.rate === rate)?.amount ?? 0;
    const diff = Math.max(0, newAmount - prevAmount);
    if (diff > 0) {
      breakdown.push({ rate, amount: diff });
    }
  }

  // НДФЛ именно с этой выплаты = сумма по всем ставкам из breakdown
  const ndflForPayment = breakdown.reduce((sum, b) => sum + b.amount, 0);

  return {
    ndfl: ndflForPayment,
    newAccumulatedIncome: newAccumulatedIncomeKop,
    newTotalTax: totalNewTax,
    breakdown,
  };
}
