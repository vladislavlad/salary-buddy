import { z } from 'zod';
import { VacationTypeSchema } from './enums';

// Отпуск
export const VacationSchema = z.object({
  id: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  type: VacationTypeSchema,
});

export type Vacation = z.infer<typeof VacationSchema>;
