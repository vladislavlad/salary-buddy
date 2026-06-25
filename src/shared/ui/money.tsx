import { formatMoney } from "@/shared/lib/money";

/**
 * Отображает денежную сумму в копейках моноширинным шрифтом для выравнивания цифр.
 */
export function Money({ amount }: { amount: number }) {
  return (
    <span className="[font-variant-numeric:tabular-nums]">
      {formatMoney(amount)}
    </span>
  );
}
