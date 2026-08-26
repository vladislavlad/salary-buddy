import { calculateNdflForPayment } from "../ndfl";

// Максимальная ставка НДФЛ в шкале: нижняя граница коэффициента net/gross.
const MAX_NDFL_RATE = 22;
const NET_RATE_FLOOR = 100 - MAX_NDFL_RATE; // 78
// Итераций бинарного поиска более чем достаточно для диапазона в копейках.
const BINARY_SEARCH_ITERATIONS = 100;
// Линейный добор вокруг найденного интервала: НДФЛ дискретен, точного
// совпадения net может не быть.
const LINEAR_SCAN_MARGIN = 5;
// Фолбэк, если точного gross не найдено: плоские 13%.
const FALLBACK_NDFL_RATE = 13;

/** Обратный расчёт: по сумме «на руки» в копейках и накопленному доходу находит сумму до НДФЛ. */
export function grossFromNet(
  netKop: number,
  priorYtdGrossKop: number,
  year: number,
): number {
  let lo = netKop;
  let hi = Math.ceil((netKop * 100) / NET_RATE_FLOOR);

  for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
    const mid = Math.round((lo + hi) / 2);
    const check = calculateNdflForPayment(mid, priorYtdGrossKop, year);
    if (mid - check.ndfl === netKop) return mid;
    if (mid - check.ndfl < netKop) lo = mid + 1;
    else hi = mid - 1;
  }

  for (
    let g = Math.max(netKop, lo - LINEAR_SCAN_MARGIN);
    g <= hi + LINEAR_SCAN_MARGIN;
    g++
  ) {
    const c = calculateNdflForPayment(g, priorYtdGrossKop, year);
    if (g - c.ndfl === netKop) return g;
  }

  return Math.round((netKop * 100) / (100 - FALLBACK_NDFL_RATE));
}
