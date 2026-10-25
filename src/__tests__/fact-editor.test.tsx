// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { localDate } from "@/shared/types/local-date";
import type { Payment } from "@/shared/types";
import { useFactEditor } from "@/features/calendar/hooks/useFactEditor";
import { grossFromNet } from "@/features/payments/model/calculation-engine";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay:2025:06:27:00",
    sourceId: "sal:2025:06:a",
    date: localDate(2025, 6, 27),
    type: "salary",
    salaryAmount: 100_000,
    gross: 100_000,
    ndfls: [],
    ndfl: 0,
    net: 100_000,
    yearToDateGross: 0,
    month: 6,
    ...overrides,
  };
}

function renderFactEditor(payments: Payment[]) {
  const setFact = vi.fn();
  const { result } = renderHook(() => useFactEditor(payments, setFact));
  return { result, setFact };
}

describe("useFactEditor: накопленный доход до выплаты", () => {
  it("при установленном факте вычитает эффективный gross (net + ndfl), а не плановый", () => {
    // Доход до выплаты 2 395 000 ₽, факт 10 000 ₽ (план 1 000 ₽).
    // yearToDateGross уже посчитан от факта – как в buildPaymentsWithNdfl.
    const priorKop = 239_500_000;
    const factKop = 1_000_000;
    const ndflKop = 72_500;
    const payment = makePayment({
      gross: 100_000,
      fact: factKop,
      ndfls: [
        { rate: 13, amount: 65_000 },
        { rate: 15, amount: 7_500 },
      ],
      ndfl: ndflKop,
      net: factKop - ndflKop,
      yearToDateGross: priorKop + factKop,
    });

    const { result } = renderFactEditor([payment]);
    act(() => result.current.startEdit(payment));

    const ctx = result.current.editingContext;
    expect(ctx).not.toBeNull();
    if (!ctx || ctx.noNdfl) throw new Error("Ожидалась ветка с НДФЛ");
    expect(ctx.priorYtdGrossKop).toBe(priorKop);
    // Регрессия: старая формула yearToDateGross - gross давала завышенный доход
    expect(payment.yearToDateGross - payment.gross).not.toBe(priorKop);
  });

  it("без факта доход до выплаты = yearToDateGross - gross", () => {
    const priorKop = 500_000;
    const payment = makePayment({
      gross: 100_000,
      ndfls: [{ rate: 13, amount: 13_000 }],
      ndfl: 13_000,
      net: 87_000,
      yearToDateGross: priorKop + 100_000,
    });

    const { result } = renderFactEditor([payment]);
    act(() => result.current.startEdit(payment));

    const ctx = result.current.editingContext;
    expect(ctx).not.toBeNull();
    if (!ctx || ctx.noNdfl) throw new Error("Ожидалась ветка с НДФЛ");
    expect(ctx.priorYtdGrossKop).toBe(priorKop);
  });

  it("подтверждение считает gross от правильного накопленного дохода (переход порога 2,4 млн)", () => {
    // Правильный prior ниже порога 13/15%, завышенный (по старой формуле) – выше.
    const priorKop = 239_500_000;
    const factKop = 1_000_000;
    const ndflKop = 72_500;
    const payment = makePayment({
      gross: 100_000,
      fact: factKop,
      ndfls: [
        { rate: 13, amount: 65_000 },
        { rate: 15, amount: 7_500 },
      ],
      ndfl: ndflKop,
      net: factKop - ndflKop,
      yearToDateGross: priorKop + factKop,
    });

    const { result, setFact } = renderFactEditor([payment]);
    act(() => result.current.startEdit(payment));
    act(() => result.current.setEditValue("900")); // 900 ₽ на руки
    act(() => result.current.confirmFact());

    const expectedGross = grossFromNet(90_000, priorKop, 2025);
    const buggyGross = grossFromNet(
      90_000,
      priorKop + (factKop - payment.gross),
      2025,
    );
    // Тест чувствителен к багу: неверный prior даёт другой gross
    expect(expectedGross).not.toBe(buggyGross);
    expect(setFact).toHaveBeenCalledWith(payment.id, expectedGross);
  });
});

describe("useFactEditor: выплаты без НДФЛ", () => {
  it("СФР-часть больничного: на руки = gross, обратный расчёт не выполняется", () => {
    const payment = makePayment({
      id: "pay:2025:06:30:00",
      sourceId: "sick:2025:01",
      type: "sick-leave-sfr",
      salaryAmount: 0,
      gross: 45_000,
      ndfl: 0,
      net: 45_000,
      yearToDateGross: 100_000,
    });

    const { result, setFact } = renderFactEditor([payment]);
    act(() => result.current.startEdit(payment));
    expect(result.current.editingContext?.noNdfl).toBe(true);

    act(() => result.current.setEditValue("40"));
    act(() => result.current.confirmFact());
    expect(setFact).toHaveBeenCalledWith(payment.id, 4_000);
  });

  it("доплата: на руки = gross, обратный расчёт не выполняется", () => {
    const payment = makePayment({
      id: "pay:2025:06:30:01",
      sourceId: "sur:2025:06",
      type: "surcharge",
      salaryAmount: 0,
      gross: 20_000,
      ndfl: 0,
      net: 20_000,
      yearToDateGross: 100_000,
    });

    const { result, setFact } = renderFactEditor([payment]);
    act(() => result.current.startEdit(payment));
    expect(result.current.editingContext?.noNdfl).toBe(true);

    act(() => result.current.setEditValue("25"));
    act(() => result.current.confirmFact());
    expect(setFact).toHaveBeenCalledWith(payment.id, 2_500);
  });
});
