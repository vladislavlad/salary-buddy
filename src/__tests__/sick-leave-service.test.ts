import { describe, it, expect } from "vitest";
import { SickLeaveApplicationService } from "@/features/sick-leave/model/SickLeaveApplicationService";
import type { CalendarData, SickLeave } from "@/shared/types";
import { localDate } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

function createService(
  calendars: ReadonlyMap<number, CalendarData>,
  initialSickLeaves: SickLeave[] = [],
): SickLeaveApplicationService {
  return new SickLeaveApplicationService(
    new InMemoryRepository(initialSickLeaves),
    calendars,
  );
}

describe("sick-leave-service", () => {
  it("add: генерирует ID и вычисляет dates", async () => {
    const service = createService(loadCalendars(2026));

    const result = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 7,
      reason: "illness",
      experience: "8plus",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toMatch(/^sick:\d{4}:\d{2}$/);
    expect(result.value.calendarDays).toBe(7);
    expect(result.value.reason).toBe("illness");
    expect(result.value.dates.length).toBe(7);
    expect(result.value.dates[0]!.toString()).toBe("2026-06-01");
    expect(result.value.dates[6]!.toString()).toBe("2026-06-07");
  });

  it("add: нумерует больничные внутри года", async () => {
    const service = createService(loadCalendars(2025));

    const r1 = await service.add({
      startDate: localDate(2025, 6, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "8plus",
    });
    if (!r1.ok) throw new Error("unexpected");

    const r2 = await service.add({
      startDate: localDate(2025, 8, 1),
      calendarDays: 10,
      reason: "work-injury",
      experience: "under5",
    });
    if (!r2.ok) throw new Error("unexpected");

    expect(r1.value.id).toBe("sick:2025:01");
    expect(r2.value.id).toBe("sick:2025:02");
  });

  it("add: ошибка при количестве дней < 1", async () => {
    const service = createService(loadCalendars(2026));

    const result = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 0,
      reason: "illness",
      experience: "8plus",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("больше нуля");
  });

  it("add: ошибка при отсутствии календаря", async () => {
    const service = createService(new Map());

    const result = await service.add({
      startDate: localDate(2099, 6, 1),
      calendarDays: 7,
      reason: "illness",
      experience: "8plus",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("не загружен");
  });

  it("update: обновляет поля существующего больничного", async () => {
    const service = createService(loadCalendars(2026));

    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "under5",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await service.update({
      sickLeaveId: created.value.id,
      calendarDays: 10,
      reason: "work-injury",
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.value.calendarDays).toBe(10);
    expect(updated.value.reason).toBe("work-injury");
    expect(updated.value.startDate.toString()).toBe("2026-06-01");
    expect(updated.value.dates.length).toBe(10);
  });

  it("update: ошибка при изменении на год без календаря", async () => {
    const service = createService(loadCalendars(2026));

    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "8plus",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.update({
      sickLeaveId: created.value.id,
      startDate: localDate(2099, 6, 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("не загружен");
  });

  it("update: ошибка при изменении дней на 0", async () => {
    const service = createService(loadCalendars(2026));

    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "8plus",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await service.update({
      sickLeaveId: created.value.id,
      calendarDays: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("больше нуля");
  });

  it("remove: удаляет больничный по ID", async () => {
    const service = createService(loadCalendars(2026));

    const created = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "8plus",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.remove(created.value.id);

    const all = await service.findAll();
    expect(all.length).toBe(0);
  });

  it("dates: включает выходные и праздники (календарные дни)", async () => {
    const service = createService(loadCalendars(2026));

    // 1 июня – суббота, 7 дней должны включать ВСЕ календарные дни
    const result = await service.add({
      startDate: localDate(2026, 6, 1),
      calendarDays: 7,
      reason: "illness",
      experience: "8plus",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Даты идут подряд без пропусков выходных/праздников
    for (let i = 0; i < result.value.dates.length - 1; i++) {
      const next = result.value.dates[i]!.add({ days: 1 });
      expect(result.value.dates[i + 1]!.toString()).toBe(next.toString());
    }
  });

  it("findAll: возвращает все больничные", async () => {
    const service = createService(loadCalendars(2026));

    await service.add({
      startDate: localDate(2026, 3, 1),
      calendarDays: 5,
      reason: "illness",
      experience: "8plus",
    });
    await service.add({
      startDate: localDate(2026, 7, 1),
      calendarDays: 10,
      reason: "child-care-under7",
      experience: "under5",
    });

    const all = await service.findAll();
    expect(all.length).toBe(2);
  });
});
