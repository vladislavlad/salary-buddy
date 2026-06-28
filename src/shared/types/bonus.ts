import { z } from "zod";
import { BonusTypeSchema } from "./enums";
import { type LocalDate, LocalDateSchema } from "./local-date";

// Премия – для типа 'custom' amount хранится в копейках (до НДФЛ), для 'salaries' – кол-во окладов.
export const BonusSchema = z.object({
  id: z.string(),
  date: LocalDateSchema,
  amount: z.number().positive("Сумма премии должна быть больше нуля"), // копейки (custom) или кол-во окладов (salaries)
  type: BonusTypeSchema,
});

export type Bonus = z.infer<typeof BonusSchema>;

// Запрос на создание премии (без id, генерируется в сервисе).
export interface BonusCreateRequest {
  date: LocalDate;
  amount: number; // копейки (custom) или кол-во окладов (salaries)
  type: z.infer<typeof BonusTypeSchema>;
}

// Запрос на обновление премии.
export interface BonusUpdateRequest {
  bonusId: string;
  date?: LocalDate;
  amount?: number; // копейки (custom) или кол-во окладов (salaries)
  type?: z.infer<typeof BonusTypeSchema>;
}
