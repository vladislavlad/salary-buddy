import { describe, it, expect } from "vitest";
import { VacationApplicationService } from "@/features/vacation/model/VacationApplicationService";
import type { CalendarData } from "@/shared/types";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import { localDate } from "@/shared/types/local-date";
import { loadCalendar } from "./fixtures/calendars";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

function createService(
  calendars: ReadonlyMap<number, CalendarData>,
  initialVacations: Vacation[] = [],
): VacationApplicationService {
  return new VacationApplicationService(
    new InMemoryRepository(initialVacations),
    calendars,
  );
}

describe("vacation-service", () => {
  it("add: генерирует ID и вычисляет dates", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    const req: VacationCreateRequest = {
      startDate: localDate(2026, 6, 1),
      calendarDays: 7,
      type: "paid",
    };
    const result = await service.add(req);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toMatch(/^vac:\d{4}:\d{2}$/);
    expect(result.value.calendarDays).toBe(7);
    expect(result.value.type).toBe("paid");
    expect(result.value.dates.length).toBe(7);
    expect(result.value.dates[0]!.toString()).toBe("2026-06-01");
    expect(result.value.dates[6]!.toString()).toBe("2026-06-07");
  });

  it("add: нумерует отпуска внутри года", async () => {
    const cal25 = loadCalendar(2025);
    const service = createService(new Map([[2025, cal25]]));

    const r1 = await service.add({
      startDate: localDate(2025, 6, 1),
      calendarDays: 7,
      type: "paid",
    });
    if (!r1.ok) throw new Error("unexpected");

    const r2 = await service.add({
      startDate: localDate(2025, 8, 1),
      calendarDays: 14,
      type: "paid",
    });
    if (!r2.ok) throw new Error("unexpected");

    expect(r1.value.id).toBe("vac:2025:01");
    expect(r2.value.id).toBe("vac:2025:02");
  });

  it("add: ошибка при количестве дней < 1", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    const result = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 0,
      type: "paid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("от 1 до 28");
  });

  it("add: ошибка при количестве дней > 28", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    const result = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 29,
      type: "paid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("от 1 до 28");
  });

  it("add: ошибка при начале отпуска с праздника (01.01)", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    // 01.01 – Новый год, код 8 в фикстуре
    const result = await service.add({
      startDate: localDate(2026, 1, 1),
      calendarDays: 7,
      type: "paid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("праздничного дня");
  });

  it("add: даты включают праздники (продление отпуска по ТК РФ)", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    // 12.01 – первый рабочий день после новогодних праздников, 3 дня
    const result = await service.add({
      startDate: localDate(2026, 1, 12),
      calendarDays: 3,
      type: "paid",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // computeVacationDates исключает праздники из массива dates
    expect(result.value.dates.length).toBe(3);
    expect(result.value.dates[0]!.toString()).toBe("2026-01-12");
  });

  it("update: обновляет поля существующего отпуска", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 7,
      type: "paid",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const req: VacationUpdateRequest = {
      vacationId: created.value.id,
      calendarDays: 14,
    };
    const updated = await service.update(req);

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.calendarDays).toBe(14);
    expect(updated.value.startDate.toString()).toBe("2026-06-01");
    expect(updated.value.dates.length).toBe(14);
  });

  it("update: ошибка при изменении startDate на праздник (01.01)", async () => {
    const cal26 = loadCalendar(2026);
    const service = createService(new Map([[2026, cal26]]));

    // Создаём отпуск на рабочий день
    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 7,
      type: "paid",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // Пытаемся изменить на праздник – Новый год
    const result = await service.update({
      vacationId: created.value.id,
      startDate: localDate(2026, 1, 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("праздничного дня");
  });

  it("add: ошибка при отсутствии календаря", async () => {
    const service = createService(new Map());

    const result = await service.add({
      startDate: localDate(2099, 6, 1),
      calendarDays: 7,
      type: "paid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("не загружен");
  });
});
