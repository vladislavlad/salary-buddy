import { z } from 'zod';

const MAX_PAYMENT_DAY = 28;

// Способ распределения зарплаты
export const PaymentDistributionSchema = z.enum(['fifty-fifty', 'by-worked-days']);
export type PaymentDistribution = z.infer<typeof PaymentDistributionSchema>;

// Тип премии
export const BonusTypeSchema = z.enum(['salaries', 'custom']);
export type BonusType = z.infer<typeof BonusTypeSchema>;

// Тип отпуска
export const VacationTypeSchema = z.enum(['paid', 'unpaid']);
export type VacationType = z.infer<typeof VacationTypeSchema>;

// Отпуск
export const VacationSchema = z.object({
  id: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  type: VacationTypeSchema,
});

export type Vacation = z.infer<typeof VacationSchema>;

// Настройки зарплаты пользователя
export const SalarySettingsSchema = z.object({
  salary: z.number().min(0, 'Оклад должен быть больше нуля'),
  advanceDay: z.number().min(1).max(MAX_PAYMENT_DAY, `Число аванса от 1 до ${MAX_PAYMENT_DAY}`),
  salaryDay: z.number().min(1).max(MAX_PAYMENT_DAY, `Число зарплаты от 1 до ${MAX_PAYMENT_DAY}`),
  distribution: PaymentDistributionSchema,
});

export type SalarySettings = z.infer<typeof SalarySettingsSchema>;

// Премия
export const BonusSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  amount: z.number().positive('Сумма премии должна быть больше нуля'),
  type: BonusTypeSchema,
});

export type Bonus = z.infer<typeof BonusSchema>;

// Данные производственного календаря из API isdayoff.ru
// Ключ — дата в формате YYYYMMDD, значение — код дня (0=рабочий, 1=нерабочий, 2=сокращённый, 8=праздник)
export type CalendarData = Map<string, number>;

// Разбивка НДФЛ по ставкам
export interface TaxBracketBreakdown {
  rate: number; // ставка в % (13, 15, 18, 20, 22)
  amount: number; // сумма налога по этой ставке
}

// Информация о выплате
export interface PaymentInfo {
  date: Date;
  originalDate: Date; // исходная дата до смещения на выходные
  type: 'advance' | 'salary' | 'vacation';
  gross: number; // сумма до НДФЛ (оклад)
  ndfl: number; // НДФЛ
  net: number; // на руки
  month: number; // месяц выплаты (1-12)
  taxBreakdown?: TaxBracketBreakdown[];
}

// Результат расчёта зарплаты за год
export interface YearCalculation {
  payments: PaymentInfo[];
  bonusPayments: BonusPaymentInfo[];
  vacationDays: Map<string, boolean>; // YYYY-MM-DD -> true для дней отпуска
  totalGross: number;
  totalNdfl: number;
  totalNet: number;
}

// Информация о выплате премии с рассчитанным НДФЛ
export interface BonusPaymentInfo {
  date: Date;
  gross: number;
  ndfl: number;
  net: number;
  taxBreakdown?: TaxBracketBreakdown[];
}

// Настройки расчёта отпускных
export const VacationSettingsSchema = z.object({
  annualIncome12m: z.number().min(0).optional(), // доход за последние 12 мес (gross), undefined = salary * 12
});

export type VacationSettings = z.infer<typeof VacationSettingsSchema>;
