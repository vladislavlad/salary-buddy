import { useMemo } from "react";
import type { Payment, Vacation } from "@/shared/types";
import { dateToKey } from "@/shared/lib/utils";

export interface YearSummary {
  /** Карта "ключ даты → true" для дней отпуска в этом году (для подсветки в календаре). */
  vacationDays: Map<string, boolean>;
  totalGross: number;
  totalNdfl: number;
  totalNet: number;
}

/**
 * Итоги за год: суммы из выплат (доплаты не учитываются) и дни отпуска для календаря.
 * `payments` ожидаются уже отфильтрованными по году.
 */
export function useYearSummary(
  payments: Payment[],
  vacations: Vacation[],
  year: number,
): YearSummary {
  const vacationDays = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const v of vacations) {
      for (const d of v.dates) {
        if (d.year === year) {
          map.set(dateToKey(d), true);
        }
      }
    }
    return map;
  }, [vacations, year]);

  const totalGross = useMemo(
    () =>
      payments.reduce(
        (s, p) => (p.type === "surcharge" ? s : s + (p.fact ?? p.gross)),
        0,
      ),
    [payments],
  );

  const totalNdfl = useMemo(
    () =>
      payments.reduce((s, p) => (p.type === "surcharge" ? s : s + p.ndfl), 0),
    [payments],
  );

  return {
    vacationDays,
    totalGross,
    totalNdfl,
    totalNet: totalGross - totalNdfl,
  };
}
