import type { CalendarData } from "@/shared/types";
import { localDate as ld } from "@/shared/types/local-date";
import { localDateToCalendarKey } from "@/shared/lib/utils";

const ISDAYOFF_BASE_URL = "https://isdayoff.ru/api/getdata";

/** Разделяет официальные праздники (код 8) и выходные (код 1) в ответе API. */
const SEPARATE_HOLIDAY_AND_WEEKEND = 1;

// Коды дней из isdayoff.ru:
//   0 – рабочий день
//   1 – нерабочий день (выходной)
//   2 – сокращённый рабочий день
//   8 – официальный праздник

/** Загружает календарь из isdayoff.ru. Возвращает `null`, если API не содержит данных за год (строка из одних нулей). */
export async function isdayoffFetch(year: number): Promise<CalendarData | null> {
  const url = `${ISDAYOFF_BASE_URL}?year=${year}&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить календарь за ${year} год`);
  }

  // API возвращает строку из цифр – по одной на каждый день года (365 или 366 символов)
  const raw = await response.text();
  // Оставляем только цифры, убираем разделители и переносы строк
  const digits = raw.replace(/\D/g, "");

  // Пустая строка или строка из одних нулей — данных за год нет (будущий год / ошибка API)
  if (/^0*$/.test(digits)) {
    return null;
  }

  const data = new Map<string, number>();

  for (let i = 0; i < digits.length && i < 366; i++) {
    const date = ld(year, 1, 1).add({ days: i });
    const code = parseInt(digits.charAt(i), 10);
    if (!isNaN(code)) {
      data.set(localDateToCalendarKey(date), code);
    }
  }

  return data;
}
