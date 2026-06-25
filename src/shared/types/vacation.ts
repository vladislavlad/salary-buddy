import { z } from "zod";
import type { VacationType } from "./enums";
import { VacationTypeSchema } from "./enums";
import type { LocalDate } from "./local-date";
import { LocalDateSchema } from "./local-date";

export const VacationSchema = z.object({
  id: z.string(),
  startDate: LocalDateSchema,
  calendarDays: z.number().int().min(1).max(28),
  dates: z.array(LocalDateSchema),
  type: VacationTypeSchema,
});

export type Vacation = z.infer<typeof VacationSchema>;

export interface VacationCreateRequest {
  startDate: LocalDate;
  calendarDays: number;
  type: VacationType;
}

export interface VacationUpdateRequest {
  vacationId: string;
  startDate?: LocalDate;
  calendarDays?: number;
  type?: VacationType;
}
