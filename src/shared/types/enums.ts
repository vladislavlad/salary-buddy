import { z } from "zod";

// Способ распределения зарплаты
export const PaymentDistributionSchema = z.enum([
  "fifty-fifty",
  "by-worked-days",
]);
export type PaymentDistribution = z.infer<typeof PaymentDistributionSchema>;

// Тип премии
export const BonusTypeSchema = z.enum(["salaries", "custom"]);
export type BonusType = z.infer<typeof BonusTypeSchema>;

// Тип отпуска
export const VacationTypeSchema = z.enum(["paid", "unpaid"]);
export type VacationType = z.infer<typeof VacationTypeSchema>;
