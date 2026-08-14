import type { TaxBracketBreakdown } from "@/shared/types";
import { multiplyByPercent } from "@/shared/lib/money";
import {
  RC_BASE_BRACKETS,
  getYearSettings,
} from "@/shared/lib/yearSettings";

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

// НДФЛ с конкретной выплаты = разница налогов на накопленный доход до/после выплаты,
// посчитанная по каждому диапазону и сведённая по ставкам.
function bracketDiffForPayment(
  previousAccumulatedKop: number,
  paymentKop: number,
  brackets: [number, number][],
): TaxBracketBreakdown[] {
  const newAccumulatedKop = previousAccumulatedKop + paymentKop;
  const newBracketTaxes = computeBracketTaxes(newAccumulatedKop, brackets);
  const prevBracketTaxes = computeBracketTaxes(previousAccumulatedKop, brackets);

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
  return breakdown;
}

// Сложение разбивок по ставкам (основная база + база РК).
function mergeBreakdowns(
  main: TaxBracketBreakdown[],
  rc: TaxBracketBreakdown[],
): TaxBracketBreakdown[] {
  const byRate = new Map<number, number>();
  for (const item of [...main, ...rc]) {
    byRate.set(item.rate, (byRate.get(item.rate) ?? 0) + item.amount);
  }
  return [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, amount]) => ({ rate, amount }));
}

export interface NdflRcOptions {
  /** Часть выплаты, относящаяся к районному коэффициенту, копейки. */
  rcKop?: number;
  /** Накопленная часть РК с начала года до этой выплаты, копейки. */
  previousRcAccumulatedKop?: number;
  /**
   * К выплате применяется отдельная база РК (п. 6.2 ст. 210, п. 1.2 ст. 224 НК РФ).
   * Категория выплат и год – по таблице настроек (yearSettings).
   */
  separateRcBase?: boolean;
}

export function calculateNdflForPayment(
  paymentGrossKop: number,
  previousAccumulatedIncomeKop: number,
  year: number,
  rc?: NdflRcOptions,
): {
  ndfl: number;
  newAccumulatedIncome: number;
  newTotalTax: number;
  breakdown: TaxBracketBreakdown[];
  newRcAccumulatedIncome: number;
} {
  const TAX_BRACKETS = getYearSettings(year).ndflBrackets;

  const rcKop = rc?.rcKop ?? 0;
  const previousRcKop = rc?.previousRcAccumulatedKop ?? 0;
  // Отдельная база РК действует, если часть РК есть и для года/категории
  // выплат это предусмотрено таблицей настроек. Иначе часть РК остаётся
  // в основной базе (общая шкала).
  const separateRcBase = rcKop > 0 && (rc?.separateRcBase ?? false);
  const mainGrossKop = separateRcBase ? paymentGrossKop - rcKop : paymentGrossKop;

  const newAccumulatedIncomeKop =
    previousAccumulatedIncomeKop + mainGrossKop;

  const mainBreakdown = bracketDiffForPayment(
    previousAccumulatedIncomeKop,
    mainGrossKop,
    TAX_BRACKETS,
  );
  const totalNewTax = computeBracketTaxes(newAccumulatedIncomeKop, TAX_BRACKETS).reduce(
    (sum, b) => sum + b.amount,
    0,
  );

  let rcBreakdown: TaxBracketBreakdown[] = [];
  let newRcAccumulatedKop = previousRcKop;
  if (separateRcBase) {
    rcBreakdown = bracketDiffForPayment(previousRcKop, rcKop, RC_BASE_BRACKETS);
    newRcAccumulatedKop = previousRcKop + rcKop;
  }

  const breakdown = mergeBreakdowns(mainBreakdown, rcBreakdown);

  // НДФЛ именно с этой выплаты = сумма по всем ставкам из breakdown
  const ndflForPayment = breakdown.reduce((sum, b) => sum + b.amount, 0);

  return {
    ndfl: ndflForPayment,
    newAccumulatedIncome: newAccumulatedIncomeKop,
    newTotalTax: totalNewTax,
    breakdown,
    newRcAccumulatedIncome: newRcAccumulatedKop,
  };
}
