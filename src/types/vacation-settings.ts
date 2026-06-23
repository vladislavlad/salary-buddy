import { z } from 'zod';

// Настройки расчёта отпускных
export const VacationSettingsSchema = z.object({
  annualIncome12m: z.number().min(0).optional(), // доход за последние 12 мес (gross), undefined = salary * 12
});

export type VacationSettings = z.infer<typeof VacationSettingsSchema>;
