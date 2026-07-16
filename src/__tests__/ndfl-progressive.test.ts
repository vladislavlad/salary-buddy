import { describe, it, expect } from "vitest";
import { calculateNdflForPayment } from "@/features/payments/model/ndfl";

// Все суммы в копейках.
describe("NDFL — прогрессивная шкала 2026", () => {
  // --- Базовые ставки внутри одного диапазона ---

  it("13% при доходе до 2,4 млн ₽", () => {
    const result = calculateNdflForPayment(100_000 * 100, 0, 2026);
    expect(result.ndfl).toBe(Math.round(100_000 * 100 * 0.13)); // 130 000 коп
    expect(result.newAccumulatedIncome).toBe(100_000 * 100);
    expect(result.breakdown.length).toBe(1);
    expect(result.breakdown[0]).toEqual({ rate: 13, amount: result.ndfl });
  });

  it("15% при переходе через порог 2,4 млн ₽", () => {
    // Накопленный = ровно 2.4M, выплата 100 коп → всё по 15%.
    const accumulated = 2_400_000 * 100;
    const result = calculateNdflForPayment(100, accumulated, 2026);

    expect(result.ndfl).toBe(Math.round(100 * 0.15));
    expect(result.breakdown.every((b) => b.rate === 15)).toBe(true);
  });

  it("смешанные ставки при пересечении порога 2,4 млн ₽", () => {
    // Накопленный = 2 300 000 ₽, выплата = 200 000 ₽.
    // Из выплаты: 100 000 ₽ по 13%, 100 000 ₽ по 15%.
    const accumulated = 2_300_000 * 100;
    const gross = 200_000 * 100;
    const result = calculateNdflForPayment(gross, accumulated, 2026);

    const ndfl13 = Math.round(100_000 * 100 * 0.13); // часть до порога
    const ndfl15 = Math.round(100_000 * 100 * 0.15); // часть выше порога

    expect(result.ndfl).toBe(ndfl13 + ndfl15);
    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown.find((b) => b.rate === 13)?.amount).toBe(ndfl13);
    expect(result.breakdown.find((b) => b.rate === 15)?.amount).toBe(ndfl15);
  });

  it("18% при переходе через порог 5 млн ₽", () => {
    const accumulated = 4_900_000 * 100; // 4 900 000 ₽
    const gross = 300_000 * 100; // +300 000 ₽ → 5 200 000 ₽

    const result = calculateNdflForPayment(gross, accumulated, 2026);

    // Из выплаты: 100 000 ₽ по 15% (до порога 5M), 200 000 ₽ по 18%
    const ndfl15 = Math.round(100_000 * 100 * 0.15);
    const ndfl18 = Math.round(200_000 * 100 * 0.18);

    expect(result.ndfl).toBe(ndfl15 + ndfl18);
    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown.find((b) => b.rate === 15)?.amount).toBe(ndfl15);
    expect(result.breakdown.find((b) => b.rate === 18)?.amount).toBe(ndfl18);
  });

  it("20% при переходе через порог 20 млн ₽", () => {
    const accumulated = 19_900_000 * 100; // 19 900 000 ₽
    const gross = 300_000 * 100; // +300 000 → 20 200 000 ₽

    const result = calculateNdflForPayment(gross, accumulated, 2026);

    // Из выплаты: 100 000 ₽ по 18% (до порога 20M), 200 000 ₽ по 20%
    const ndfl18 = Math.round(100_000 * 100 * 0.18);
    const ndfl20 = Math.round(200_000 * 100 * 0.2);

    expect(result.ndfl).toBe(ndfl18 + ndfl20);
    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown.find((b) => b.rate === 18)?.amount).toBe(ndfl18);
    expect(result.breakdown.find((b) => b.rate === 20)?.amount).toBe(ndfl20);
  });

  it("22% при переходе через порог 50 млн ₽", () => {
    const accumulated = 49_900_000 * 100; // 49 900 000 ₽
    const gross = 300_000 * 100; // +300 000 → 50 200 000 ₽

    const result = calculateNdflForPayment(gross, accumulated, 2026);

    // Из выплаты: 100 000 ₽ по 20% (до порога 50M), 200 000 ₽ по 22%
    const ndfl20 = Math.round(100_000 * 100 * 0.2);
    const ndfl22 = Math.round(200_000 * 100 * 0.22);

    expect(result.ndfl).toBe(ndfl20 + ndfl22);
    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown.find((b) => b.rate === 20)?.amount).toBe(ndfl20);
    expect(result.breakdown.find((b) => b.rate === 22)?.amount).toBe(ndfl22);
  });

  // --- Накопительный метод ---

  it("накопительный метод: последовательные выплаты нарастают", () => {
    let accumulated = 0;

    const r1 = calculateNdflForPayment(500_000 * 100, accumulated, 2026);
    accumulated = r1.newAccumulatedIncome;

    const r2 = calculateNdflForPayment(500_000 * 100, accumulated, 2026);
    accumulated = r2.newAccumulatedIncome;

    // Обе выплаты по 13% (накопленный доход < 2.4M)
    expect(r1.ndfl).toBe(Math.round(500_000 * 100 * 0.13));
    expect(r2.ndfl).toBe(Math.round(500_000 * 100 * 0.13));

    // Третья выплата доводит до ~1.5M — всё ещё 13%
    const r3 = calculateNdflForPayment(500_000 * 100, accumulated, 2026);
    expect(r3.ndfl).toBe(Math.round(500_000 * 100 * 0.13));
  });

  it("накопительный метод: переход через порог на N-й выплате", () => {
    // 5 выплат по 600 000 ₽ = 3 000 000 ₽ → пересекаем 2.4M на 5-й выплате.
    let accumulated = 0;
    const payments: number[] = [];

    for (let i = 0; i < 5; i++) {
      const gross = 600_000 * 100;
      const r = calculateNdflForPayment(gross, accumulated, 2026);
      payments.push(r.ndfl);
      accumulated = r.newAccumulatedIncome;
    }

    // Выплаты 1-4: полностью в диапазоне ≤ 2.4M (4 × 600K = 2.4M)
    expect(payments[0]).toBe(Math.round(600_000 * 100 * 0.13));
    expect(payments[1]).toBe(Math.round(600_000 * 100 * 0.13));
    expect(payments[2]).toBe(Math.round(600_000 * 100 * 0.13));
    expect(payments[3]).toBe(Math.round(600_000 * 100 * 0.13));

    // 5-я выплата: полностью по 15% (накопленный ровно 2.4M)
    expect(payments[4]).toBe(Math.round(600_000 * 100 * 0.15));

    // 6-я выплата тоже по 15% (до порога 5M)
    const r6 = calculateNdflForPayment(600_000 * 100, accumulated, 2026);
    expect(r6.ndfl).toBe(Math.round(600_000 * 100 * 0.15));
  });

  // --- Границы порогов точно в копейках ---

  it("точно на пороге 2,4 млн ₽ — последняя копейка по 13%", () => {
    const accumulated = 2_399_999 * 100 + 99; // 2 399 999.99 ₽
    const result = calculateNdflForPayment(1, accumulated, 2026);

    // 1 копейка доводит до ровно 2 400 000.00 — всё ещё в диапазоне ≤ 2.4M
    expect(result.breakdown.every((b) => b.rate === 13)).toBe(true);
  });

  it("копейка выше порога 2,4 млн ₽ — первая копейка по 15%", () => {
    const accumulated = 2_400_000 * 100; // ровно 2.4M
    const result = calculateNdflForPayment(1, accumulated, 2026);

    expect(result.breakdown.every((b) => b.rate === 15)).toBe(true);
  });

  it("точно на пороге 5 млн ₽ — последняя копейка по 15%", () => {
    const accumulated = 5_000_000 * 100 - 1; // ровно 1 копейка ниже порога
    const result = calculateNdflForPayment(1, accumulated, 2026);

    expect(result.breakdown.every((b) => b.rate === 15)).toBe(true);
  });

  it("копейка выше порога 5 млн ₽", () => {
    const accumulated = 5_000_000 * 100;
    const result = calculateNdflForPayment(1, accumulated, 2026);

    expect(result.breakdown.every((b) => b.rate === 18)).toBe(true);
  });

  // --- Конфигурация по годам ---

  it("2024 год — старая шкала (13% до 5M, 15% выше)", () => {
    const accumulated = 2_500_000 * 100; // > 2.4M но < 5M
    const result = calculateNdflForPayment(100_000 * 100, accumulated, 2024);

    // В 2024 году порог только один: 5M → всё по 13%
    expect(result.breakdown.every((b) => b.rate === 13)).toBe(true);
  });

  it("2025 год — новая шкала (как 2026)", () => {
    const accumulated = 2_500_000 * 100; // > 2.4M
    const result = calculateNdflForPayment(100_000 * 100, accumulated, 2025);

    expect(result.breakdown.every((b) => b.rate === 15)).toBe(true);
  });

  it("неизвестный год — fallback к новой шкале", () => {
    const result = calculateNdflForPayment(100_000 * 100, 2_500_000 * 100, 2030);
    expect(result.breakdown.every((b) => b.rate === 15)).toBe(true);
  });

  // --- newTotalTax монотонно растёт ---

  it("newTotalTax не уменьшается при последовательных выплатах", () => {
    let accumulated = 0;
    let prevTotalTax = 0;

    const amounts = [1_000_000, 2_000_000, 5_000_000, 10_000_000];

    for (const amt of amounts) {
      const r = calculateNdflForPayment(amt * 100, accumulated, 2026);
      expect(r.newTotalTax).toBeGreaterThanOrEqual(prevTotalTax);
      prevTotalTax = r.newTotalTax;
      accumulated = r.newAccumulatedIncome;
    }
  });

  // --- Нулевая и отрицательная выплата ---

  it("нулевая выплата — НДФЛ = 0", () => {
    const result = calculateNdflForPayment(0, 1_000_000 * 100, 2026);
    expect(result.ndfl).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  it("breakdown суммируется в ndfl", () => {
    const accumulated = 2_300_000 * 100;
    const gross = 500_000 * 100; // пересекает порог 2.4M
    const result = calculateNdflForPayment(gross, accumulated, 2026);

    const breakdownSum = result.breakdown.reduce((s, b) => s + b.amount, 0);
    expect(breakdownSum).toBe(result.ndfl);
  });
});
