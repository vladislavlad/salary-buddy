import type { CalendarData } from "@/shared/types";
import type { LocalDate } from "@/shared/types/local-date";
import type { SickLeave, SickLeaveCreateRequest, SickLeaveUpdateRequest } from "@/shared/types/sick-leave";
import type { Result } from "@/shared/result";

function generateSickLeaveId(sickLeaves: SickLeave[], year: number): string {
  const count = sickLeaves.filter((s) => s.startDate.year === year).length + 1;
  return `sick:${year}:${String(count).padStart(2, "0")}`;
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
  if (calendarDays < 1) {
    return { ok: false, error: "Количество дней должно быть больше нуля" };
  }
  return { ok: true, value: null };
}

// Вычисляет календарные дни больничного (включая выходные и праздники).
function computeSickLeaveDates(
  startDate: LocalDate,
  calendarDays: number,
): Result<LocalDate[]> {
  const daysValidation = validateCalendarDays(calendarDays);
  if (!daysValidation.ok) return daysValidation;

  try {
    const dates: LocalDate[] = [];
    for (let i = 0; i < calendarDays; i++) {
      dates.push(startDate.add({ days: i }));
    }
    return { ok: true, value: dates };
  } catch {
    return { ok: false, error: "Не удалось вычислить дни больничного" };
  }
}

export function createSickLeave(
  sickLeaves: SickLeave[],
  req: SickLeaveCreateRequest,
  calendars: ReadonlyMap<number, CalendarData>,
): Result<SickLeave> {
  const daysValidation = validateCalendarDays(req.calendarDays);
  if (!daysValidation.ok) return daysValidation;

  // Проверяем, что календарь загружен хотя бы для года начала.
  const calendar = getCalendar(calendars, req.startDate.year);
  if (!calendar.ok) return calendar;

  const dates = computeSickLeaveDates(req.startDate, req.calendarDays);
  if (!dates.ok) return dates;

  // Проверяем календари для всех годов, которые покрывает больничный.
  for (const d of dates.value) {
    const calResult = getCalendar(calendars, d.year);
    if (!calResult.ok) return calResult;
  }

  return {
    ok: true,
    value: {
      id: generateSickLeaveId(sickLeaves, req.startDate.year),
      startDate: req.startDate,
      calendarDays: req.calendarDays,
      dates: dates.value,
      reason: req.reason,
      experience: req.experience,
    },
  };
}

export function updateSickLeave(
  existing: SickLeave,
  req: SickLeaveUpdateRequest,
  calendars: ReadonlyMap<number, CalendarData>,
): Result<SickLeave> {
  const startDate = req.startDate ?? existing.startDate;
  const calendarDays = req.calendarDays ?? existing.calendarDays;
  const reason = req.reason ?? existing.reason;
  const experience = req.experience ?? existing.experience;

  const daysValidation = validateCalendarDays(calendarDays);
  if (!daysValidation.ok) return daysValidation;

  // Проверяем календарь, если дата начала изменилась.
  if (req.startDate !== undefined) {
    const calendar = getCalendar(calendars, startDate.year);
    if (!calendar.ok) return calendar;
  }

  const dates = computeSickLeaveDates(startDate, calendarDays);
  if (!dates.ok) return dates;

  return {
    ok: true,
    value: {
      ...existing,
      startDate,
      calendarDays,
      dates: dates.value,
      reason,
      experience,
    },
  };
}
