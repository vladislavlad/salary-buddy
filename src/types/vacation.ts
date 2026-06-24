import { z } from 'zod';
import { VacationTypeSchema } from './enums';

export const VacationSchema = z.object({
  id: z.string(),
  startDate: z.coerce.date(),
  calendarDays: z.number().int().min(1),
  dates: z.array(z.coerce.date()),
  type: VacationTypeSchema,
});

export type Vacation = z.infer<typeof VacationSchema>;
