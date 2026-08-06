import { useCallback, useMemo, useState } from "react";
import type { Payment } from "@/shared/types";
import { grossFromNet } from "@/features/payments/model/calculation-engine";

interface SurchargeEditingContext {
  payment: Payment;
  validNet: boolean;
  roundedNetKop: number;
  isSurcharge: true;
}

interface NonSurchargeEditingContext {
  payment: Payment;
  validNet: boolean;
  roundedNetKop: number;
  isSurcharge: false;
  priorYtdGrossKop: number;
  year: number;
}

type EditingContext = SurchargeEditingContext | NonSurchargeEditingContext;

export function useFactEditor(
  payments: Payment[],
  setFact: (id: string, value: number | undefined) => void,
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Контекст редактируемой выплаты для обратного расчёта gross от net (копейки)
  const editingContext = useMemo<EditingContext | null>(() => {
    if (!editingId) return null;
    const payment = payments.find((p) => p.id === editingId);
    if (!payment) return null;
    // Пользователь вводит рубли на руки → конвертируем в копейки
    const netValRub = parseFloat(
      editValue.replace(/[^0-9.,]/g, "").replace(",", "."),
    );
    const validNet = !isNaN(netValRub) && netValRub > 0;
    // Для доплаты grossFromNet не нужен – на руки = gross (НДФЛ = 0)
    if (payment.type === "surcharge") {
      return {
        payment,
        validNet,
        roundedNetKop: Math.round(netValRub * 100),
        isSurcharge: true as const,
      };
    }
    // priorYtdGross уже в копейках (Payment.gross и Payment.yearToDateGross – копейки)
    const priorYtdGrossKop = payment.yearToDateGross - payment.gross;
    const year = payment.date.year;
    return {
      payment,
      validNet,
      roundedNetKop: Math.round(netValRub * 100),
      isSurcharge: false as const,
      priorYtdGrossKop,
      year,
    };
  }, [editingId, payments, editValue]);

  // Превью gross при вводе net (для доплаты – нет превью, т.к. на руки = gross) – копейки
  const editPreviewGrossKop = useMemo(() => {
    if (
      !editingContext ||
      !editingContext.validNet ||
      editingContext.isSurcharge
    )
      return null;
    return grossFromNet(
      editingContext.roundedNetKop,
      editingContext.priorYtdGrossKop,
      editingContext.year,
    );
  }, [editingContext]);

  const startEdit = useCallback((payment: Payment) => {
    setEditingId(payment.id);
    // При редактировании показываем текущую сумму на руки в рублях (net – копейки → рубли)
    setEditValue(
      payment.fact != null ? String(Math.round(payment.net / 100)) : "",
    );
  }, []);

  const confirmFact = useCallback(() => {
    if (!editingContext || !editingContext.validNet) {
      setEditingId(null);
      setEditValue("");
      return;
    }
    // Для доплаты: на руки = gross (НДФЛ = 0), не нужен обратный расчёт – копейки
    if (editingContext.isSurcharge) {
      setFact(editingContext.payment.id, editingContext.roundedNetKop);
      setEditingId(null);
      setEditValue("");
      return;
    }
    const grossValKop = grossFromNet(
      editingContext.roundedNetKop,
      editingContext.priorYtdGrossKop,
      editingContext.year,
    );
    setFact(editingContext.payment.id, grossValKop);
    setEditingId(null);
    setEditValue("");
  }, [editingContext, setFact]);

  const confirmWithPlan = useCallback(
    (payment: Payment) => {
      setFact(payment.id, payment.gross);
    },
    [setFact],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue("");
  }, []);

  const removeFact = useCallback(
    (paymentId: string) => {
      setFact(paymentId, undefined);
    },
    [setFact],
  );

  return {
    editingId,
    editValue,
    setEditValue,
    editingContext,
    editPreviewGrossKop,
    startEdit,
    confirmFact,
    confirmWithPlan,
    cancelEdit,
    removeFact,
  };
}
