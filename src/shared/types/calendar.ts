import { z } from "zod";

// Данные производственного календаря из API isdayoff.ru
// Ключ – дата в формате YYYYMMDD, значение – код дня (0=рабочий, 1=нерабочий, 2=сокращённый, 4=ковидный, 8=праздник)
export type CalendarData = Map<string, number>;

// Внутренняя настройка приложения «учитывать ковидные дни» (без UI,
// в экспорт/импорт не включается).
export const CalendarSettingsSchema = z.object({
  accountForCoronavirusDays: z.boolean(),
});
export type CalendarSettings = z.infer<typeof CalendarSettingsSchema>;
