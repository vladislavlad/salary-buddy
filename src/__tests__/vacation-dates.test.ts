import { describe, it, expect } from "vitest";
import {
  computeVacationDates,
  isOfficialHoliday,
} from "@/features/calendar/model/calendar";
import type { CalendarData } from "@/shared/types";
import { localDate, type LocalDate } from "@/shared/types/local-date";
import { loadCalendar } from "@/__tests__/fixtures/calendars";

/** Слияние нескольких календарей (для跨年-отпусков). */
function mergeCalendars(...calendars: CalendarData[]): CalendarData {
  const merged = new Map<string, number>();
  for (const c of calendars) {
    for (const [k, v] of c) merged.set(k, v);
  }
  return merged;
}

/** Проверяет, что ни одна дата из массива не является официальным праздником. */
function assertNoHolidays(dates: LocalDate[], cal: CalendarData): void {
  for (const d of dates) {
    expect(isOfficialHoliday(d, cal)).toBe(false);
  }
}

describe("computeVacationDates", () => {
  describe("отпуск без праздников в диапазоне", () => {
    it("2025-03-10, 7 дней → конец 2025-03-16", () => {
      const cal = loadCalendar(2025);
      const dates = computeVacationDates(localDate(2025, 3, 10), 7, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2025-03-10",
        "2025-03-11",
        "2025-03-12",
        "2025-03-13",
        "2025-03-14",
        "2025-03-15",
        "2025-03-16",
      ]);
      assertNoHolidays(dates, cal);
    });

    it("2025-03-15, 2 дня → конец 2025-03-16", () => {
      const cal = loadCalendar(2025);
      const dates = computeVacationDates(localDate(2025, 3, 15), 2, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2025-03-15",
        "2025-03-16",
      ]);
    });

    it("2025-06-14, 5 дней → конец 2025-06-18", () => {
      const cal = loadCalendar(2025);
      const dates = computeVacationDates(localDate(2025, 6, 14), 5, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2025-06-14",
        "2025-06-15",
        "2025-06-16",
        "2025-06-17",
        "2025-06-18",
      ]);
    });

    it("2025-06-27, 7 дней → конец 2025-07-03", () => {
      const cal = loadCalendar(2025);
      const dates = computeVacationDates(localDate(2025, 6, 27), 7, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2025-06-27",
        "2025-06-28",
        "2025-06-29",
        "2025-06-30",
        "2025-07-01",
        "2025-07-02",
        "2025-07-03",
      ]);
    });

    it("2025-04-01, 1 день → конец 2025-04-01", () => {
      const cal = loadCalendar(2025);
      const dates = computeVacationDates(localDate(2025, 4, 1), 1, cal);

      expect(dates.map((d) => d.toString())).toEqual(["2025-04-01"]);
    });
  });

  describe("отпуск с официальными праздниками в диапазоне", () => {
    it("2025-06-09, 6 дней → исключить 2025-06-12 конец 2025-06-15", () => {
      const cal = loadCalendar(2025);

      expect(isOfficialHoliday(localDate(2025, 6, 12), cal)).toBe(true);

      expect(isOfficialHoliday(localDate(2025, 6, 13), cal)).toBe(false);

      const dates = computeVacationDates(localDate(2025, 6, 9), 6, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2025-06-09",
        "2025-06-10",
        "2025-06-11",
        "2025-06-13",
        "2025-06-14",
        "2025-06-15",
      ]);
      assertNoHolidays(dates, cal);
    });

    it("2024-06-10, 6 дней → исключить 2024-06-12, конец 2024-06-15", () => {
      const cal = loadCalendar(2024);

      expect(isOfficialHoliday(localDate(2024, 6, 12), cal)).toBe(true);

      const dates = computeVacationDates(localDate(2024, 6, 10), 6, cal);

      expect(dates.map((d) => d.toString())).toEqual([
        "2024-06-10",
        "2024-06-11",
        "2024-06-13",
        "2024-06-14",
        "2024-06-15",
        "2024-06-16",
      ]);
      assertNoHolidays(dates, cal);
    });

    it("2025-04-28, 12 дней → исключить 2025-05-01, исключить 2025-05-09, конец 2025-05-11", () => {
      const cal = loadCalendar(2025);

      expect(isOfficialHoliday(localDate(2025, 5, 1), cal)).toBe(true);
      expect(isOfficialHoliday(localDate(2025, 5, 2), cal)).toBe(false);
      expect(isOfficialHoliday(localDate(2025, 5, 8), cal)).toBe(false);
      expect(isOfficialHoliday(localDate(2025, 5, 9), cal)).toBe(true);

      const dates = computeVacationDates(localDate(2025, 4, 28), 12, cal);

      // 1 – праздник (код 8), пропускаем; paid = 2,3,4,5,6 → конец=06.05
      expect(dates.map((d) => d.toString())).toEqual([
        "2025-04-28",
        "2025-04-29",
        "2025-04-30",
        "2025-05-02",
        "2025-05-03",
        "2025-05-04",
        "2025-05-05",
        "2025-05-06",
        "2025-05-07",
        "2025-05-08",
        "2025-05-10",
        "2025-05-11",
      ]);
      assertNoHolidays(dates, cal);
    });

    it("2024-04-22, 13 дней → исключить 2024-05-01, конец 2024-05-05", () => {
      const cal = loadCalendar(2024);

      expect(isOfficialHoliday(localDate(2024, 5, 1), cal)).toBe(true);

      const dates = computeVacationDates(localDate(2024, 4, 22), 13, cal);

      // 22-30 апр = 9 paid, 1 мая – праздник (пропуск), 2-5 мая = 4 paid → конец=05.05
      expect(dates.map((d) => d.toString())).toEqual([
        "2024-04-22",
        "2024-04-23",
        "2024-04-24",
        "2024-04-25",
        "2024-04-26",
        "2024-04-27",
        "2024-04-28",
        "2024-04-29",
        "2024-04-30",
        "2024-05-02",
        "2024-05-03",
        "2024-05-04",
        "2024-05-05",
      ]);
      assertNoHolidays(dates, cal);
    });

    it("2024-12-30, 5 дней → новогодние праздники не расходуют отпуск", () => {
      const merged = mergeCalendars(loadCalendar(2024), loadCalendar(2025));

      expect(isOfficialHoliday(localDate(2025, 1, 1), merged)).toBe(true);

      const dates = computeVacationDates(localDate(2024, 12, 30), 5, merged);

      // 30 дек (paid), 31 дек (paid), 1-8 янв – праздники (пропуск), 9-11 = 3 paid
      expect(dates.map((d) => d.toString())).toEqual([
        "2024-12-30",
        "2024-12-31",
        "2025-01-09",
        "2025-01-10",
        "2025-01-11",
      ]);
      assertNoHolidays(dates, merged);
    });

    it("2025-01-01, 1 день → праздник не расходуется, сдвиг на первый непраздничный", () => {
      const cal = loadCalendar(2025);

      expect(isOfficialHoliday(localDate(2025, 1, 1), cal)).toBe(true);

      // 1-8 янв – все праздники (код 8), первый непраздничный = 9 янв
      const dates = computeVacationDates(localDate(2025, 1, 1), 1, cal);

      expect(dates.map((d) => d.toString())).toEqual(["2025-01-09"]);
      assertNoHolidays(dates, cal);
    });
  });

  describe("валидация", () => {
    it("2025-03-10, 0 дней → ошибка валидации", () => {
      const cal = loadCalendar(2025);
      expect(() =>
        computeVacationDates(localDate(2025, 3, 10), 0, cal),
      ).toThrow();
    });

    it("2025-03-10, -1 день → ошибка валидации", () => {
      const cal = loadCalendar(2025);
      expect(() =>
        computeVacationDates(localDate(2025, 3, 10), -1, cal),
      ).toThrow();
    });
  });
});
