import { formatCurrency } from '@/lib/format';

/**
 * Отображает денежную сумму моноширинным шрифтом для выравнивания цифр.
 */
export function Money({ amount }: { amount: number }) {
  return <span className="[font-variant-numeric:tabular-nums]">{formatCurrency(amount)}</span>;
}
