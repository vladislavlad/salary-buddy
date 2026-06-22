import { z } from 'zod';

// Способ распределения зарплаты
export const PaymentDistributionSchema = z.enum(['fifty-fifty', 'by-worked-days']);
export type PaymentDistribution = z.infer<typeof PaymentDistributionSchema>;

// Тип премии
export const BonusTypeSchema = z.enum(['salaries', 'custom']);
export type BonusType = z.infer<typeof BonusTypeSchema>;

// Настройки зарплаты пользователя
export const SalarySettingsSchema = z.object({
  salary: z.number().min(0, 'Оклад должен быть больше нуля'),
  advanceDay: z.number().min(1).max(28, 'Число аванса от 1 до 28'),
  salaryDay: z.number().min(1).max(28, 'Число зарплаты от 1 до 28'),
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

// Результат расчёта НДФЛ по прогрессивной шкале
export interface NdfResult {
  tax: number; // сумма налога
  effectiveRate: number; // эффективная ставка в %
}

// Разбивка НДФЛ по ставкам
export interface TaxBracketBreakdown {
  rate: number; // ставка в % (13, 15, 18, 20, 22)
  amount: number; // сумма налога по этой ставке
}

// Информация о выплате
export interface PaymentInfo {
  date: Date;
  originalDate: Date; // исходная дата до смещения на выходные
  type: 'advance' | 'salary';
  gross: number; // сумма до НДФЛ (оклад)
  ndfl: number; // НДФЛ
  net: number; // на руки
  month: number; // месяц выплаты (1-12)
  taxBreakdown?: TaxBracketBreakdown[];
}

// Результат расчёта зарплаты за год
export interface YearCalculation {
  payments: PaymentInfo[];
  bonuses: BonusPayment[];
  bonusPayments: BonusPaymentInfo[];
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

// Премия с рассчитанным НДФЛ
export interface BonusPayment extends Bonus {
  ndfl?: number;
  net?: number;
}
