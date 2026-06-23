const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Форматирует число как валюту в рублях.
 */
export function formatCurrency(amount: number): string {
  return CURRENCY_FORMATTER.format(Math.round(amount));
}

/**
 * Форматирует число с пробелами между разрядами: "123 456 789".
 */
export function formatMoneyInput(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const NUMBER_FORMATTER = new Intl.NumberFormat('ru-RU');

/**
 * Форматирует число с разделителями тысяч.
 */
export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}
