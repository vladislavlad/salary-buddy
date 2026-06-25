import { calculateNdflForPayment } from "../ndfl";

/** Обратный расчёт: по сумме «на руки» в копейках и накопленному доходу находит сумму до НДФЛ. */
export function grossFromNet(
  netKop: number,
  priorYtdGrossKop: number,
  year: number,
): number {
  let lo = netKop;
  let hi = Math.ceil((netKop * 100) / 78);

  for (let i = 0; i < 100; i++) {
    const mid = Math.round((lo + hi) / 2);
    const check = calculateNdflForPayment(mid, priorYtdGrossKop, year);
    if (mid - check.ndfl === netKop) return mid;
    if (mid - check.ndfl < netKop) lo = mid + 1;
    else hi = mid - 1;
  }

  for (let g = Math.max(netKop, lo - 5); g <= hi + 5; g++) {
    const c = calculateNdflForPayment(g, priorYtdGrossKop, year);
    if (g - c.ndfl === netKop) return g;
  }

  return Math.round((netKop * 100) / 87);
}
