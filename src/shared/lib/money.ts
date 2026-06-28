const CURRENCY_FORMATTER = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Форматирует копейки как валюту: 2500000 → "25 000 ₽".
 */
export function formatMoney(kopecks: number): string {
  return CURRENCY_FORMATTER.format(Math.round(kopecks / 100));
}

/**
 * Парсит строку рублей в копейки: "250000" → 25000000.
 */
export function parseRubles(str: string): number {
  const cleaned = str.replace(/\s/g, "");
  if (cleaned === "") return 0;
  return Math.round(Number(cleaned) * 100);
}

/**
 * Делит копейки на число с округлением до целой копейки.
 */
export function divideRound(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round(numerator / denominator);
}

/**
 * Умножает сумму в копейках на процентную ставку и округляет до копейки.
 * rate – целое число процентов (13, 15, …).
 */
export function multiplyByPercent(amountKop: number, percent: number): number {
  return Math.round((amountKop * percent) / 100);
}

/**
 * Форматирует копейки с пробелами для ввода: 2500000 → "2 500 000".
 */
export function formatMoneyInput(kopecks: number): string {
  return kopecks.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
