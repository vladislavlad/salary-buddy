import { useMemo } from "react";
import type { Payment, Vacation } from "@/shared/types";
import type { SickLeave } from "@/shared/types/sick-leave";
import { dateToKey } from "@/shared/lib/utils";

export interface YearSummary {
  /** Карта "ключ даты → true" для дней отпуска в этом году (для подсветки в календаре). */
  vacationDays: Map<string, boolean>;
  /** Карта "ключ даты → true" для дней больничного в этом году (для подсветки в календаре). */
  sickLeaveDays: Map<string, boolean>;
  totalGross: number;
  totalNdfl: number;
  totalNet: number;
}

/**
 * Итоги за год: суммы из выплат (доплаты не учитываются), дни отпуска и больничного для календаря.
 * `payments` ожидаются уже отфильтрованными по году.
 */
export function useYearSummary(
  payments: Payment[],
  vacations: Vacation[],
  sickLeaves: SickLeave[],
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

  const sickLeaveDays = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const sl of sickLeaves) {
      for (const d of sl.dates) {
        if (d.year === year) {
          map.set(dateToKey(d), true);
        }
      }
    }
    return map;
  }, [sickLeaves, year]);

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
    sickLeaveDays,
    totalGross,
    totalNdfl,
    totalNet: totalGross - totalNdfl,
  };
}
