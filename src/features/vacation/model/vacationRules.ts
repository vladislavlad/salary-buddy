import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import {
  computeVacationDates,
  isOfficialHoliday,
} from "@/features/calendar/model/calendar";
import type { Result } from "@/shared/result";

function generateVacationId(vacations: Vacation[], year: number): string {
  const count = vacations.filter((v) => v.startDate.year === year).length + 1;
  return `vac:${year}:${String(count).padStart(2, "0")}`;
}

function getCalendar(
  calendars: ReadonlyMap<number, CalendarData>,
  year: number,
): Result<CalendarData> {
  const calendar = calendars.get(year);
  if (!calendar) {
    return { ok: false, error: `Календарь за ${year} год не загружен` };
  }
  return { ok: true, value: calendar };
}

function validateCalendarDays(calendarDays: number): Result<null> {
  if (calendarDays < 1 || calendarDays > 28) {
    return { ok: false, error: "Количество дней должно быть от 1 до 28" };
  }
  return { ok: true, value: null };
}

function validateStartDate(
  startDate: LocalDate,
  calendar: CalendarData,
): Result<null> {
  if (isOfficialHoliday(startDate, calendar)) {
    return { ok: false, error: "Нельзя начать отпуск с праздничного дня" };
  }
  return { ok: true, value: null };
}

function computeDates(
  startDate: LocalDate,
  calendarDays: number,
  calendar: CalendarData,
): Result<LocalDate[]> {
  const daysValidation = validateCalendarDays(calendarDays);
  if (!daysValidation.ok) return daysValidation;

  try {
    return {
      ok: true,
      value: computeVacationDates(startDate, calendarDays, calendar),
    };
  } catch {
    return { ok: false, error: "Не удалось вычислить даты отпуска" };
  }
}

export function createVacation(
  vacations: Vacation[],
  req: VacationCreateRequest,
  calendars: ReadonlyMap<number, CalendarData>,
): Result<Vacation> {
  const daysValidation = validateCalendarDays(req.calendarDays);
  if (!daysValidation.ok) return daysValidation;

  const calendar = getCalendar(calendars, req.startDate.year);
  if (!calendar.ok) return calendar;

  const startValidation = validateStartDate(req.startDate, calendar.value);
  if (!startValidation.ok) return startValidation;

  const dates = computeDates(req.startDate, req.calendarDays, calendar.value);
  if (!dates.ok) return dates;

  return {
    ok: true,
    value: {
      id: generateVacationId(vacations, req.startDate.year),
      startDate: req.startDate,
      calendarDays: req.calendarDays,
      dates: dates.value,
      type: req.type,
    },
  };
}

export function updateVacation(
  existing: Vacation,
  req: VacationUpdateRequest,
  calendars: ReadonlyMap<number, CalendarData>,
): Result<Vacation> {
  const startDate = req.startDate ?? existing.startDate;
  const calendarDays = req.calendarDays ?? existing.calendarDays;
  const type = req.type ?? existing.type;

  const daysValidation = validateCalendarDays(calendarDays);
  if (!daysValidation.ok) return daysValidation;

  const calendar = getCalendar(calendars, startDate.year);
  if (!calendar.ok) return calendar;

  if (req.startDate !== undefined) {
    const startValidation = validateStartDate(startDate, calendar.value);
    if (!startValidation.ok) return startValidation;
  }

  const dates = computeDates(startDate, calendarDays, calendar.value);
  if (!dates.ok) return dates;

  return {
    ok: true,
    value: {
      ...existing,
      startDate,
      calendarDays,
      dates: dates.value,
      type,
    },
  };
}
