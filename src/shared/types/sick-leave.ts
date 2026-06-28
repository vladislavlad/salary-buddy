import { z } from "zod";
import type { SickLeaveReason, SickLeaveExperience } from "./enums";
import { SickLeaveReasonSchema, SickLeaveExperienceSchema } from "./enums";
import type { LocalDate } from "./local-date";
import { LocalDateSchema } from "./local-date";

export const SickLeaveSchema = z.object({
  id: z.string(),
  startDate: LocalDateSchema,
  calendarDays: z.number().int().min(1),
  dates: z.array(LocalDateSchema),
  reason: SickLeaveReasonSchema,
  experience: SickLeaveExperienceSchema,
});

export type SickLeave = z.infer<typeof SickLeaveSchema>;

export interface SickLeaveCreateRequest {
  startDate: LocalDate;
  calendarDays: number;
  reason: SickLeaveReason;
  experience: SickLeaveExperience;
}

export interface SickLeaveUpdateRequest {
  sickLeaveId: string;
  startDate?: LocalDate;
  calendarDays?: number;
  reason?: SickLeaveReason;
  experience?: SickLeaveExperience;
}

// Настройки доплаты от работодателя
export const SickLeaveSettingsSchema = z.object({
  enableTopUp: z.boolean().default(false),
  topUpDaysLimitPerYear: z.number().int().min(1).default(20),
});

export type SickLeaveSettings = z.infer<typeof SickLeaveSettingsSchema>;
