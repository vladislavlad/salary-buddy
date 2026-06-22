/**
 * Форматирует число как валюту в рублях.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Форматирует число с разделителями тысяч.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}
