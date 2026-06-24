import { z } from 'zod';
import { SalarySettingsSchema, BonusSchema, VacationSchema } from '@/types';

export const ExportDataSchema = z.object({
  exportDate: z.string(),
  settings: SalarySettingsSchema,
  bonuses: BonusSchema.array(),
  vacations: VacationSchema.array(),
  facts: z.record(z.string(), z.number()),
});

export type ExportData = z.infer<typeof ExportDataSchema>;
