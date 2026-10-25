import { useCallback, useMemo, useState } from "react";
import type { Payment } from "@/shared/types";
import { grossFromNet } from "@/features/payments/model/calculation-engine";

// Выплаты без НДФЛ: на руки = gross, обратный расчёт grossFromNet не нужен.
interface NoNdflEditingContext {
  payment: Payment;
  validNet: boolean;
  roundedNetKop: number;
  noNdfl: true;
}

interface TaxedEditingContext {
  payment: Payment;
  validNet: boolean;
  roundedNetKop: number;
  noNdfl: false;
  priorYtdGrossKop: number;
  year: number;
}

type EditingContext = NoNdflEditingContext | TaxedEditingContext;

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
    // Для доплаты и СФР-части НДФЛ = 0: на руки = gross
    if (payment.type === "surcharge" || payment.type === "sick-leave-sfr") {
      return {
        payment,
        validNet,
        roundedNetKop: Math.round(netValRub * 100),
        noNdfl: true as const,
      };
    }
    // Накопленный доход ДО этой выплаты (копейки). yearToDateGross хранит
    // доход ПОСЛЕ выплаты и уже включает эффективный gross (fact, если
    // установлен), поэтому вычитаем эффективный gross = net + ndfl,
    // а не плановый payment.gross.
    const priorYtdGrossKop =
      payment.yearToDateGross - (payment.net + payment.ndfl);
    const year = payment.date.year;
    return {
      payment,
      validNet,
      roundedNetKop: Math.round(netValRub * 100),
      noNdfl: false as const,
      priorYtdGrossKop,
      year,
    };
  }, [editingId, payments, editValue]);

  // Превью gross при вводе net (для выплат без НДФЛ – нет превью, т.к. на руки = gross) – копейки
  const editPreviewGrossKop = useMemo(() => {
    if (!editingContext || !editingContext.validNet || editingContext.noNdfl)
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
    // Для доплаты и СФР: на руки = gross (НДФЛ = 0), не нужен обратный расчёт – копейки
    if (editingContext.noNdfl) {
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
