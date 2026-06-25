import { z } from "zod";
import type { LocalDate } from "./local-date";
import { LocalDateSchema } from "./local-date";

// Разбивка НДФЛ по ставкам для одной выплаты
export interface TaxBracketBreakdown {
  rate: number; // ставка в % (13, 15, 18, 20, 22)
  amount: number; // сумма налога по этой ставке (копейки)
}

// Информация о выплате — единый источник данных для календаря и итогов
// Все денежные поля хранятся в копейках.
export interface Payment {
  id: string; // pay:{year}:{month}:{day}:{increment} — уникальный ID платежа
  sourceId: string; // ID сущности-источника: sal:{y}:{m}:a, bon:{y}:{seq}, vac:{y}:{seq}, sur:{y}:{m}
  date: LocalDate; // фактическая дата выплаты (после смещения на выходные)
  originalDate?: LocalDate; // исходная дата до смещения (нет у премий и доплат)
  type: "advance" | "salary" | "vacation" | "bonus" | "surcharge";
  salaryAmount: number; // оклад на момент выплаты, копейки (0 для отпускных, премий и доплат)
  gross: number; // плановая сумма до НДФЛ, копейки (для доплаты — сумма без налога)
  fact?: number; // фактическая gross-сумма, копейки (если подтверждена)
  ndfls: TaxBracketBreakdown[]; // разбивка НДФЛ по ставкам [{ставка, размер}, ...]
  ndfl: number; // итоговый НДФЛ = сумма всех элементов ndfls, копейки (0 для доплаты)
  net: number; // на руки, копейки (рассчитан от fact если есть, иначе от gross)
  yearToDateGross: number; // накопленный gross с начала года после этой выплаты, копейки
  month?: number; // месяц выплаты (1-12, нет у премий)
}

export const PaymentSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  date: LocalDateSchema,
  originalDate: LocalDateSchema.optional(),
  type: z.enum(["advance", "salary", "vacation", "bonus", "surcharge"]),
  salaryAmount: z.number(),
  gross: z.number(),
  fact: z.number().optional(),
  ndfls: z.array(z.object({ rate: z.number(), amount: z.number() })),
  ndfl: z.number(),
  net: z.number(),
  yearToDateGross: z.number(),
  month: z.number().optional(),
});
