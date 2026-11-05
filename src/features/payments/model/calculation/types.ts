import type { Overtime } from "@/features/overtime/model/overtime";
import type {
  SalaryCalculationSettings,
  SalaryChange,
  Bonus,
  Payment,
  CalendarData,
  Vacation,
  SurchargeChange,
  SickLeave,
  SickLeaveSettings,
  PaymentType,
  RegionalCoefficientChange,
} from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";

/** Параметры фазы генерации событий аванс/зарплата. */
export interface BuildSalaryParams {
  settings: SalaryCalculationSettings;
  sortedChanges: readonly SalaryChange[];
  sortedSurchargeChanges: readonly SurchargeChange[];
  sortedRegionalCoefficientChanges?: readonly RegionalCoefficientChange[];
  vacations: Vacation[];
  sickLeaves: SickLeave[];
  calendarsByYear: Map<number, CalendarData>;
  minYear: number;
  maxYear: number;
}

/** Параметры фазы стабилизации отпускных. */
export interface StabilizeVacationsParams {
  events: RawEvent[];
  vacations: Vacation[];
  factBySource: Map<string, number>;
  calendarsByYear: Map<number, CalendarData>;
  minYear: number;
  maxYear: number;
}

/** Параметры фазы расчёта больничных. */
export interface SickLeavePhaseParams {
  events: RawEvent[];
  sickLeaves: SickLeave[];
  sickLeaveSettings: SickLeaveSettings | undefined;
  calendarsByYear: Map<number, CalendarData>;
  sortedChanges: readonly SalaryChange[];
  sortedRegionalCoefficientChanges?: readonly RegionalCoefficientChange[];
  paymentDatesByMonth: Map<string, MonthPaymentDates>;
  factBySource: Map<string, number>;
}

/** Параметры фазы применения НДФЛ и сборки платежей. */
export interface NdflPhaseParams {
  events: RawEvent[];
  factBySource: Map<string, number>;
  existingPayments: Payment[];
  recalcFrom: LocalDate | undefined;
  minYear: number;
}

export interface CalculateAllInput {
  settings: SalaryCalculationSettings;
  bonuses: Bonus[];
  overtime?: Overtime[];
  surcharges: SurchargeChange[];
  regionalCoefficients?: RegionalCoefficientChange[];
  vacations: Vacation[];
  sickLeaves: SickLeave[];
  sickLeaveSettings: SickLeaveSettings;
  calendarsByYear: Map<number, CalendarData>;
  existingPayments?: Payment[];
  recalcFrom?: LocalDate;
}

export interface RawEvent {
  // ID сущности-источника: sal:{y}:{m}:a, sur:{y}:{m}, {bonus.id}, {vacation.id},
  // {sickLeave.id}[:emp|sfr|topup:{y}:{m}:{a|b}]
  sourceId: string;
  date: LocalDate;
  originalDate?: LocalDate;
  type: PaymentType;
  grossKop: number; // копейки
  salaryAmountKop: number; // оклад на момент выплаты, копейки (0 для отпускных и доплат)
  regionalCoefficientPercent?: number; // применённый районный коэффициент в % (для отображения)
  rcKop?: number; // часть gross, относящаяся к районному коэффициенту, копейки (для отдельной базы НДФЛ)
  month?: number;
  // Первый день месяца начисления (за который заработано). Для отпускных средний
  // заработок считается по этому месяцу, а не по дате выплаты.
  accrualDate?: LocalDate;
}

/** Среднее число календарных дней в месяце (для расчёта отпускных по ТК РФ). */
export const AVG_MONTH_DAYS = 29.3;

/**
 * Даты выплаты аванса и зарплаты за рабочий месяц (год-месяц).
 * Используется для размещения выплат работодателя по больничному:
 * дни 1-15 → дата аванса, дни 16+ → дата зарплаты.
 */
export interface MonthPaymentDates {
  advanceDate: LocalDate | null;
  salaryDate: LocalDate | null;
}
