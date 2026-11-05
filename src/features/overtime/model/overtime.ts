import { z } from "zod";
import { MAX_DISPLAY_YEAR, MIN_DISPLAY_YEAR } from "@/shared/lib/yearSettings";
import { LocalDateSchema } from "@/shared/types/local-date";

export const OVERTIME_MULTIPLIERS = [1, 2, 3] as const;

export const OvertimeInputSchema = z.object({
  date: LocalDateSchema.refine(
    (date) => date.year >= MIN_DISPLAY_YEAR && date.year <= MAX_DISPLAY_YEAR,
    `Выберите дату с ${MIN_DISPLAY_YEAR} по ${MAX_DISPLAY_YEAR} год`,
  ),
  hours: z.number().finite().positive().max(24),
  multiplier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const OvertimeSchema = OvertimeInputSchema.extend({
  id: z.string(),
});

export type OvertimeInput = z.infer<typeof OvertimeInputSchema>;
export type Overtime = z.infer<typeof OvertimeSchema>;
