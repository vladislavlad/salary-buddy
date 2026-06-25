import type {
  SalaryCalculationSettings,
  Bonus,
  Payment,
  CalendarData,
  Vacation,
  SurchargeChange,
} from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";

export interface CalculateAllInput {
  settings: SalaryCalculationSettings;
  bonuses: Bonus[];
  surcharges: SurchargeChange[];
  vacations: Vacation[];
  calendarsByYear: Map<number, CalendarData>;
  existingPayments?: Payment[];
  recalcFrom?: LocalDate;
}

export interface RawEvent {
  sourceId: string; // ID сущности-источника: sal:{y}:{m}:a, bon:{y}:{seq}, vac:{y}:{seq}, sur:{y}:{m}
  date: LocalDate;
  originalDate?: LocalDate;
  type: "advance" | "salary" | "vacation" | "bonus" | "surcharge";
  grossKop: number; // копейки
  salaryAmountKop: number; // оклад на момент выплаты, копейки (0 для отпускных и доплат)
  month?: number;
  // Первый день месяца начисления (за который заработано). Для отпускных средний
  // заработок считается по этому месяцу, а не по дате выплаты.
  accrualDate?: LocalDate;
}

/** Среднее число календарных дней в месяце (для расчёта отпускных по ТК РФ). */
export const AVG_MONTH_DAYS = 29.3;
