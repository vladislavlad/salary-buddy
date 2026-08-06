import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { Payment, TaxBracketBreakdown } from "@/shared/types";
import { usePaymentsStore } from "@/features/payments/hooks/usePaymentsHooks";
import { useFactEditor } from "@/features/calendar/hooks/useFactEditor";
import { Money } from "@/shared/ui/money";
import {
  PAYMENT_PRIORITY,
  getPaymentLabel,
} from "./calendar-payment-utils";
import { localToDate } from "@/shared/types/local-date";
import { Button } from "@/shared/ui/button";
import { FactEditorInline } from "./FactEditorInline";

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = 8;
const POPOVER_GAP_BELOW = 6;
const POPOVER_GAP_ABOVE = 2;

interface PaymentDetailsProps {
  label?: string;
  salaryAmount?: number;
  isBonus?: boolean;
  gross: number;
  fact?: number;
  ndfls: TaxBracketBreakdown[];
  ndfl: number;
  net: number;
}

function PaymentDetails({
  label,
  salaryAmount,
  isBonus,
  gross,
  fact,
  ndfls,
  ndfl,
  net,
}: PaymentDetailsProps) {
  return (
    <>
      {label && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Тип:</span>
          <span>{label}</span>
        </div>
      )}
      {salaryAmount != null && salaryAmount > 0 && !isBonus && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Оклад:</span>
          <span>
            <Money amount={salaryAmount} />
          </span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">План:</span>
        <span className="font-medium">
          <Money amount={gross} />
        </span>
      </div>
      {fact != null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Факт:</span>
          <span className="font-medium text-blue-600">
            <Money amount={fact} />
          </span>
        </div>
      )}
      {ndfls.length > 0 ? (
        ndfls.map((b) => (
          <div key={b.rate} className="flex justify-between">
            <span className="text-muted-foreground">НДФЛ ({b.rate}%):</span>
            <span className="text-red-500">
              -<Money amount={b.amount} />
            </span>
          </div>
        ))
      ) : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">НДФЛ:</span>
          <span className="text-red-500">
            -<Money amount={ndfl} />
          </span>
        </div>
      )}
      <div className="flex justify-between font-medium">
        <span>На руки:</span>
        <span className="text-green-600">
          <Money amount={net} />
        </span>
      </div>
    </>
  );
}

interface PaymentDetailsPanelProps {
  payments: Payment[];
  anchorRef: HTMLDivElement | null;
  onClose: () => void;
}

export function PaymentDetailsPanel({
  payments,
  anchorRef,
  onClose,
}: PaymentDetailsPanelProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });
  const { setFact } = usePaymentsStore();
  const {
    editingId,
    editValue,
    setEditValue,
    editPreviewGrossKop,
    startEdit,
    confirmFact,
    cancelEdit,
    removeFact,
    confirmWithPlan,
  } = useFactEditor(payments, setFact);

  useLayoutEffect(() => {
    function updatePosition() {
      if (!anchorRef || !anchorRef.isConnected) return;
      const rect = anchorRef.getBoundingClientRect();
      const popoverEl = popoverRef.current;
      const popoverHeight = popoverEl
        ? popoverEl.offsetHeight
        : payments.length > 1
          ? 420
          : 240;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      if (left < POPOVER_MARGIN) left = POPOVER_MARGIN;
      if (left + POPOVER_WIDTH > viewportW - POPOVER_MARGIN)
        left = viewportW - POPOVER_WIDTH - POPOVER_MARGIN;

      // Сначала пытаемся показать снизу
      let top = rect.bottom + POPOVER_GAP_BELOW;
      const fitsBelow = top + popoverHeight <= viewportH - POPOVER_MARGIN;

      if (!fitsBelow) {
        // Пытаемся сверху
        const aboveTop = rect.top - popoverHeight - POPOVER_GAP_ABOVE;
        const fitsAbove = aboveTop >= POPOVER_MARGIN;

        if (fitsAbove) {
          top = aboveTop;
        } else {
          // Не влазит ниоткуда – выбираем сторону с большим свободным местом
          const spaceBelow = viewportH - rect.bottom - POPOVER_MARGIN;
          const spaceAbove = rect.top - POPOVER_MARGIN;
          if (spaceBelow >= spaceAbove) {
            top = Math.max(
              POPOVER_MARGIN,
              viewportH - popoverHeight - POPOVER_MARGIN,
            );
          } else {
            top = POPOVER_MARGIN;
          }
        }
      }

      setPosition({ top, left });
    }

    // Первый проход – с оценочной высотой, второй – после рендера с реальной
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef, payments.length]);

  // Закрытие по клику вне поповера. Используем mousedown на document вместо
  // полноэкранного оверлея – иначе оверлей перехватывал бы клики по ячейкам
  // календаря, и повторный клик не открывал бы поповер на другой ячейке.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const el = popoverRef.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onClose]);

  const sortedPayments = [...payments].sort(
    (a, b) => (PAYMENT_PRIORITY[b.type] ?? 0) - (PAYMENT_PRIORITY[a.type] ?? 0),
  );

  const firstPayment = sortedPayments[0];
  const maxYearToDateGross = Math.max(
    ...sortedPayments.map((p) => p.yearToDateGross),
  );
  const totalNet = sortedPayments.reduce((sum, p) => sum + p.net, 0);

  return (
    <>
      <div
        ref={popoverRef}
        className="fixed z-50 w-[280px] rounded-lg border bg-card-secondary popover-shadow p-3 space-y-2 text-sm"
        style={{ top: position.top, left: position.left }}
      >
        <p className="font-semibold">
          {firstPayment
            ? format(localToDate(firstPayment.date), "d MMMM yyyy", {
                locale: ru,
              })
            : ""}
        </p>
        {sortedPayments.map((item, idx) => {
          const isEditing = editingId === item.id;
          return (
            <div key={idx}>
              {idx > 0 && <div className="border-t my-2" />}
              <PaymentDetails
                label={getPaymentLabel(item.type)}
                salaryAmount={item.salaryAmount}
                isBonus={item.type === "bonus"}
                gross={item.gross}
                fact={item.fact}
                ndfls={item.ndfls}
                ndfl={item.ndfl}
                net={item.net}
              />
              {isEditing ? (
                <FactEditorInline
                  editValue={editValue}
                  setEditValue={setEditValue}
                  editPreviewGrossKop={editPreviewGrossKop}
                  onConfirm={confirmFact}
                  onCancel={cancelEdit}
                />
              ) : (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(item)}
                      className="flex-1"
                    >
                      Изменить
                    </Button>
                    {item.fact != null ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFact(item.id)}
                        className="flex-1"
                      >
                        Отменить факт
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => confirmWithPlan(item)}
                        className="flex-1"
                      >
                        Подтвердить
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Доход с начала года:</span>
            <span>
              <Money amount={maxYearToDateGross} />
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="font-semibold">Итого на руки:</span>
            <span className="font-bold text-green-600">
              <Money amount={totalNet} />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
