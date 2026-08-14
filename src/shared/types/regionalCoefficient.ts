import { z } from "zod";
import { LocalDateSchema } from "./local-date";

export const RegionalCoefficientChangeSchema = z.object({
  id: z.string(),
  effectiveDate: LocalDateSchema,
  percent: z.number().min(0, "Коэффициент не может быть отрицательным").max(100, "Коэффициент не может превышать 100%"),
});

export type RegionalCoefficientChange = z.infer<typeof RegionalCoefficientChangeSchema>;

export type RegionalCoefficientPercent = number;

export interface RegionalCoefficientCreateRequest {
  effectiveDate: z.infer<typeof LocalDateSchema>;
  percent: RegionalCoefficientPercent;
}

export interface RegionalCoefficientUpdateRequest {
  coefficientId: string;
  effectiveDate?: z.infer<typeof LocalDateSchema>;
  percent?: RegionalCoefficientPercent;
}
