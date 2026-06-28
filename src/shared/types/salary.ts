import { z } from "zod";
import { PaymentDistributionSchema } from "./enums";
import { LocalDateSchema } from "./local-date";

const MAX_PAYMENT_DAY = 28;

// Изменение оклада (запись в списке) – amount хранится в копейках.
export const SalaryChangeSchema = z.object({
  id: z.string(),
  effectiveDate: LocalDateSchema, // дата начала действия оклада
  amount: z.number().min(0, "Оклад должен быть больше нуля"), // копейки
});

export type SalaryChange = z.infer<typeof SalaryChangeSchema>;

// Оклад как полноценная пользовательская сущность.
export const SalarySchema = SalaryChangeSchema;

export type Salary = z.infer<typeof SalarySchema>;

// Настройки дат и режима выплат.
export const SalaryPaymentSettingsSchema = z.object({
  advancePaymentDay: z
    .number()
    .min(1)
    .max(MAX_PAYMENT_DAY, `Число аванса от 1 до ${MAX_PAYMENT_DAY}`),
  salaryPaymentDay: z
    .number()
    .min(1)
    .max(MAX_PAYMENT_DAY, `Число зарплаты от 1 до ${MAX_PAYMENT_DAY}`),
  distribution: PaymentDistributionSchema,
});

export type SalaryPaymentSettings = z.infer<typeof SalaryPaymentSettingsSchema>;

export const SalaryCalculationSettingsSchema =
  SalaryPaymentSettingsSchema.extend({
    salaryChanges: z.array(SalaryChangeSchema),
  });

export type SalaryCalculationSettings = z.infer<
  typeof SalaryCalculationSettingsSchema
>;
