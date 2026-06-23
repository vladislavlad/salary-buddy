import { z } from 'zod';
import { BonusTypeSchema } from './enums';

// Премия
export const BonusSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  amount: z.number().positive('Сумма премии должна быть больше нуля'),
  type: BonusTypeSchema,
});

export type Bonus = z.infer<typeof BonusSchema>;
