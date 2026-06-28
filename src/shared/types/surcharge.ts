import { z } from "zod";
import { type LocalDate, LocalDateSchema } from "./local-date";

// Изменение доплаты (запись в списке) – amount хранится в копейках.
export const SurchargeChangeSchema = z.object({
  id: z.string(),
  effectiveDate: LocalDateSchema, // дата начала действия доплаты
  amount: z.number().min(0, "Доплата должна быть больше нуля"), // копейки
});

export type SurchargeChange = z.infer<typeof SurchargeChangeSchema>;

// Запрос на создание доплаты (без id, генерируется в сервисе).
export interface SurchargeCreateRequest {
  effectiveDate: LocalDate;
  amount: number; // копейки
}

// Запрос на обновление доплаты.
export interface SurchargeUpdateRequest {
  surchargeId: string;
  effectiveDate?: LocalDate;
  amount?: number; // копейки
}
