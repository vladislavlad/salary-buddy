import { formatMoney, formatMoneyInput } from "./money";

/**
 * Форматирует копейки как валюту в рублях: 2500000 → "25 000 ₽".
 */
export function formatCurrency(kopecks: number): string {
  return formatMoney(kopecks);
}

/**
 * Форматирует копейки с пробелами между разрядами для ввода: 2500000 → "2 500 000".
 */
export { formatMoneyInput };

const NUMBER_FORMATTER = new Intl.NumberFormat("ru-RU");

/**
 * Форматирует число с разделителями тысяч.
 */
export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}
