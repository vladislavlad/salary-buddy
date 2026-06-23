import { z } from 'zod';
import { PaymentDistributionSchema } from './enums';

const MAX_PAYMENT_DAY = 28;

// Изменение оклада (запись в списке)
export const SalaryChangeSchema = z.object({
  id: z.string(),
  effectiveDate: z.coerce.date(), // дата начала действия оклада (YYYY-MM-01)
  amount: z.number().min(0, 'Оклад должен быть больше нуля'),
});

export type SalaryChange = z.infer<typeof SalaryChangeSchema>;

// Настройки зарплаты пользователя
export const SalarySettingsSchema = z.object({
  advancePaymentDay: z.number().min(1).max(MAX_PAYMENT_DAY, `Число аванса от 1 до ${MAX_PAYMENT_DAY}`),
  salaryPaymentDay: z.number().min(1).max(MAX_PAYMENT_DAY, `Число зарплаты от 1 до ${MAX_PAYMENT_DAY}`),
  distribution: PaymentDistributionSchema,
  salaryChanges: z.array(SalaryChangeSchema),
});

export type SalarySettings = z.infer<typeof SalarySettingsSchema>;
