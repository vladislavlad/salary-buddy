import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { usePaymentsStore } from "@/features/payments/hooks/usePaymentsHooks";
import { localToDate, type LocalDate } from "@/shared/types/local-date";
import { Button } from "@/shared/ui/button";
import { Money } from "@/shared/ui/money";
import { toast } from "@/shared/ui/use-toast";
import { useOvertime } from "../hooks/useOvertime";
import type { OvertimeInput } from "../model/overtime";
import { OvertimeForm } from "./OvertimeForm";

function formatDate(date: LocalDate) {
  return format(localToDate(date), "d MMMM yyyy", { locale: ru });
}

export function OvertimeManager() {
  const { overtime, saveOvertime, removeOvertime, loading, saving } =
    useOvertime();
  const { payments } = usePaymentsStore();
  const [form, setForm] = useState<"new" | { id: string } | null>(null);
  const entries = [...overtime].sort((a, b) =>
    Temporal.PlainDate.compare(b.date, a.date),
  );
  const paymentsBySource = new Map(
    payments
      .filter((payment) => payment.type === "overtime")
      .map((payment) => [payment.sourceId, payment]),
  );

  async function save(input: OvertimeInput, id?: string) {
    try {
      const result = await saveOvertime({ input, id });
      if (result.ok) setForm(null);
      else toast({ variant: "destructive", description: result.error });
    } catch {
      toast({
        variant: "destructive",
        description: "Не удалось сохранить переработку",
      });
    }
  }

  async function remove(id: string) {
    try {
      await removeOvertime(id);
    } catch {
      toast({
        variant: "destructive",
        description: "Не удалось удалить переработку",
      });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Оплата за часы сверх графика добавляется к ближайшему авансу или
        зарплате.
      </p>
      {entries.map((entry) => {
        const payment = paymentsBySource.get(entry.id);
        const label = formatDate(entry.date);
        return (
          <div
            key={entry.id}
            className="rounded-lg border bg-card-secondary p-3"
          >
            {typeof form === "object" && form?.id === entry.id ? (
              <OvertimeForm
                initial={entry}
                saving={saving}
                onSave={(input) => save(input, entry.id)}
                onCancel={() => setForm(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.hours.toLocaleString("ru-RU", {
                      maximumFractionDigits: 20,
                    })}{" "}
                    ч ×{entry.multiplier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment ? (
                      <>
                        {formatDate(payment.date)} ·{" "}
                        <Money amount={payment.gross} /> до НДФЛ
                      </>
                    ) : (
                      "Выплата пока не рассчитана"
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Изменить переработку за ${label}`}
                    disabled={saving}
                    onClick={() => setForm({ id: entry.id })}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label={`Удалить переработку за ${label}`}
                    disabled={saving}
                    onClick={() => void remove(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {form === "new" ? (
        <div className="rounded-lg border bg-card-secondary p-3">
          <OvertimeForm
            saving={saving}
            onSave={save}
            onCancel={() => setForm(null)}
          />
        </div>
      ) : (
        form === null && (
          <Button
            type="button"
            className="w-full"
            disabled={loading || saving}
            onClick={() => setForm("new")}
          >
            <Plus className="w-4 h-4" />
            Добавить переработку
          </Button>
        )
      )}
    </div>
  );
}
