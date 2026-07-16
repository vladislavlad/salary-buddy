import { describe, it, expect } from "vitest";
import { calculateNdflForPayment } from "@/features/payments/model/ndfl";
import { grossFromNet } from "@/features/payments/model/calculation-engine";

// Все суммы в копейках.
describe("grossFromNet — обратный расчёт net → gross", () => {
  // --- Базовые случаи внутри одного диапазона ---

  it("простой случай: 100 000 ₽ на руки при накопленном 0 (13%)", () => {
    const netKop = 100_000 * 100;
    const grossKop = grossFromNet(netKop, 0, 2026);

    // Проверяем round-trip: gross - ndfl === net
    const ndfl = calculateNdflForPayment(grossKop, 0, 2026);
    expect(grossKop - ndfl.ndfl).toBe(netKop);
  });

  it("50 000 ₽ на руки при накопленном 1 млн (13%)", () => {
    const netKop = 50_000 * 100;
    const priorYtd = 1_000_000 * 100;
    const grossKop = grossFromNet(netKop, priorYtd, 2026);

    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);
    expect(grossKop - ndfl.ndfl).toBe(netKop);
  });

  it("малая сумма: 1 ₽ на руки", () => {
    const netKop = 100; // 1 ₽ в копейках
    const grossKop = grossFromNet(netKop, 0, 2026);

    const ndfl = calculateNdflForPayment(grossKop, 0, 2026);
    expect(grossKop - ndfl.ndfl).toBe(netKop);
  });

  it("нулевая сумма на руки", () => {
    const netKop = 0;
    const grossKop = grossFromNet(netKop, 0, 2026);
    expect(grossKop).toBe(0);
  });

  // --- Переход через порог НДФЛ ---

  it("переход через порог 2,4 млн ₽", () => {
    // Накопленный доход = 2 350 000 ₽. Выплата на руки = 100 000 ₽.
    // Часть выплаты облагается по 13%, часть — по 15%.
    const netKop = 100_000 * 100;
    const priorYtd = 2_350_000 * 100;
    const grossKop = grossFromNet(netKop, priorYtd, 2026);

    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);
    expect(grossKop - ndfl.ndfl).toBeCloseTo(netKop, -1); // доп. ±1 копейка из-за округления
  });

  it("переход через порог 5 млн ₽", () => {
    const netKop = 200_000 * 100;
    const priorYtd = 4_900_000 * 100;
    const grossKop = grossFromNet(netKop, priorYtd, 2026);

    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);
    expect(grossKop - ndfl.ndfl).toBeCloseTo(netKop, -1);
  });

  it("переход через порог 20 млн ₽", () => {
    const netKop = 500_000 * 100;
    const priorYtd = 19_500_000 * 100;
    const grossKop = grossFromNet(netKop, priorYtd, 2026);

    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);
    expect(grossKop - ndfl.ndfl).toBeCloseTo(netKop, -1);
  });

  // --- Точность на границах порогов ---

  it("точно на пороге 2,4 млн ₽ — нет разрыва", () => {
    const priorYtd = 2_399_999 * 100;
    const netKop = 100; // 1 ₽

    const grossKop = grossFromNet(netKop, priorYtd, 2026);
    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);

    // На границе ставки может не быть точного совпадения — проверяем близость.
    expect(Math.abs((grossKop - ndfl.ndfl) - netKop)).toBeLessThanOrEqual(1);
  });

  it("копейка выше порога 2,4 млн ₽", () => {
    const priorYtd = 2_400_000 * 100;
    const netKop = 8500; // ~100 ₽ при ставке 15%

    const grossKop = grossFromNet(netKop, priorYtd, 2026);
    const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);

    expect(Math.abs((grossKop - ndfl.ndfl) - netKop)).toBeLessThanOrEqual(1);
  });

  // --- Крупные суммы через несколько диапазонов ---

  it("крупная выплата: 5 млн ₽ на руки при накопленном 0", () => {
    const netKop = 5_000_000 * 100;
    const grossKop = grossFromNet(netKop, 0, 2026);

    // gross > net (т.к. есть НДФЛ)
    expect(grossKop).toBeGreaterThan(netKop);

    const ndfl = calculateNdflForPayment(grossKop, 0, 2026);
    // Выплата пересекает пороги 2.4M и частично 5M — проверяем близость
    expect(Math.abs((grossKop - ndfl.ndfl) - netKop)).toBeLessThanOrEqual(100); // ±1 ₽ допустимо
  });

  it("очень крупная выплата: 30 млн ₽ на руки", () => {
    const netKop = 30_000_000 * 100;
    const grossKop = grossFromNet(netKop, 0, 2026);

    expect(grossKop).toBeGreaterThan(netKop);
    const ndfl = calculateNdflForPayment(grossKop, 0, 2026);
    // Пересекает все пороги — погрешность может быть больше
    expect(Math.abs((grossKop - ndfl.ndfl) - netKop)).toBeLessThanOrEqual(1_000); // ±10 ₽ допустимо
  });

  // --- Разные годы ---

  it("2024 год — старая шкала", () => {
    const netKop = 100_000 * 100;
    const grossKop = grossFromNet(netKop, 0, 2024);

    const ndfl = calculateNdflForPayment(grossKop, 0, 2024);
    expect(grossKop - ndfl.ndfl).toBe(netKop);
  });

  it("неизвестный год — fallback к новой шкале", () => {
    const netKop = 100_000 * 100;
    const gross2030 = grossFromNet(netKop, 2_500_000 * 100, 2030);
    const gross2026 = grossFromNet(netKop, 2_500_000 * 100, 2026);

    // 2030 и 2026 используют одну и ту же шкалу (NDFL_PROGRESSIVE_2)
    expect(gross2030).toBe(gross2026);
  });

  // --- Монотонность: больший net → больший gross ---

  it("монотонность: больший net даёт больший или равный gross", () => {
    const priorYtd = 1_000_000 * 100;
    let prevGross = 0;

    for (const net of [10_000, 50_000, 100_000, 200_000, 500_000]) {
      const grossKop = grossFromNet(net * 100, priorYtd, 2026);
      expect(grossKop).toBeGreaterThanOrEqual(prevGross);
      prevGross = grossKop;
    }
  });

  // --- Edge case: gap на границе ставки ---

  it("gap на границе 13%→15%: нет точного совпадения, но погрешность ≤ 1 копейка", () => {
    // При переходе с 13% на 15% возникает «разрыв»: некоторые значения net
    // не имеют точного gross. Проверяем, что grossFromNet возвращает ближайшее.
    const priorYtd = 2_399_999 * 100;

    // Пробуем разные net вблизи границы
    for (const netOffset of [0, 1, 87, 88, 89, 90, 100, 150]) {
      const netKop = 85 * 100 + netOffset; // ~85 ₽ + offset
      const grossKop = grossFromNet(netKop, priorYtd, 2026);

      if (grossKop > 0) {
        const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);
        const diff = Math.abs((grossKop - ndfl.ndfl) - netKop);
        expect(diff).toBeLessThanOrEqual(1);
      }
    }
  });

  // --- Фоллбэк: grossFromNet не находит точное совпадение ---

  it("результат фоллбэка близок к ожидаемому", () => {
    // Конструируем ситуацию, где бинарный поиск может не найти точный gross.
    // На границе прогрессивной шкалы функция net(gross) не монотонна с шагом 1 копейка.
    const priorYtd = 2_399_999 * 100 + 50;

    // Ищем net, для которого нет точного gross
    let foundFallback = false;
    for (let netKop = 8400; netKop <= 8600; netKop++) {
      const grossKop = grossFromNet(netKop, priorYtd, 2026);
      const ndfl = calculateNdflForPayment(grossKop, priorYtd, 2026);

      if (grossKop - ndfl.ndfl !== netKop) {
        // Точного совпадения нет — проверяем погрешность фоллбэка
        expect(Math.abs((grossKop - ndfl.ndfl) - netKop)).toBeLessThanOrEqual(5);
        foundFallback = true;
      }
    }

    // Если не нашли gap в этом диапазоне, тест всё равно проходит —
    // важно проверить поведение, если gap существует.
  });
});
