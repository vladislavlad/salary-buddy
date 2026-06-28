// Данные производственного календаря из API isdayoff.ru
// Ключ – дата в формате YYYYMMDD, значение – код дня (0=рабочий, 1=нерабочий, 2=сокращённый, 8=праздник)
export type CalendarData = Map<string, number>;
