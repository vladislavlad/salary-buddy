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

// Причина больничного
export const SickLeaveReasonSchema = z.enum([
  "illness",
  "work-injury",
  "child-care-under7",
  "child-care-7to15",
]);
export type SickLeaveReason = z.infer<typeof SickLeaveReasonSchema>;

// Страховой стаж (общий, за который уплачивались взносы в СФР)
export const SickLeaveExperienceSchema = z.enum(["under5", "5to8", "8plus"]);
export type SickLeaveExperience = z.infer<typeof SickLeaveExperienceSchema>;
