// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarContext } from "@/features/calendar/model/CalendarContext";
import { VacationsProvider } from "@/features/vacation/model/VacationsProvider";
import { useVacationsProvider } from "@/features/vacation/hooks/useVacationsProvider";
import { localDate } from "@/shared/types/local-date";
import { loadCalendars } from "./fixtures/calendars";
import { VacationApplicationService } from "@/features/vacation/model/VacationApplicationService";
import type { VacationServiceFactory } from "@/features/vacation/hooks/useVacations";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";

vi.mock("@/shared/ui/use-toast", () => ({
  toast: vi.fn(),
}));

/** Компонент-потребитель, экспонирует контекст через внешний объект. */
function ContextConsumer({
  exposeRef,
}: {
  exposeRef: { current: ReturnType<typeof useVacationsProvider> | null };
}) {
  const ctx = useVacationsProvider();
  exposeRef.current = ctx;
  return <span data-testid="count">{ctx.vacations.length}</span>;
}

describe("VacationsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    const ref: { current: ReturnType<typeof useVacationsProvider> | null } = {
      current: null,
    };
    const repository = new InMemoryRepository([]);
    const createService: VacationServiceFactory = (calendars) =>
      new VacationApplicationService(repository, calendars);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CalendarContext.Provider
          value={{
            calendars: loadCalendars(2025, 2026),
            isLoading: false,
            displayYears: [2025, 2026],
          }}
        >
          <VacationsProvider createService={createService}>
            <ContextConsumer exposeRef={ref} />
          </VacationsProvider>
        </CalendarContext.Provider>
      </QueryClientProvider>,
    );

    return { ref, repository };
  }

  it("начальное состояние — пустой массив", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current!.vacations).toEqual([]);
  });

  it("addVacation добавляет отпуск и сохраняет в repository", async () => {
    const { ref, repository } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 6, 14),
        calendarDays: 14,
        type: "paid",
      });
    });

    expect(ref.current!.vacations).toHaveLength(1);
    await expect(repository.findAll()).resolves.toHaveLength(1);
  });

  it("addVacation генерирует ID формата vac:YYYY:NN", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 6, 14),
        calendarDays: 7,
        type: "paid",
      });
    });

    const v = ref.current!.vacations[0]!;
    expect(v.id).toMatch(/^vac:\d{4}:\d{2}$/);
    expect(v.calendarDays).toBe(7);
    expect(v.type).toBe("paid");
  });

  it("addVacation нумерует отпуска внутри года", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 6, 1),
        calendarDays: 7,
        type: "paid",
      });
    });

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 8, 1),
        calendarDays: 14,
        type: "paid",
      });
    });

    await waitFor(() => expect(ref.current!.vacations).toHaveLength(2));
    expect(ref.current!.vacations[0]!.id).toBe("vac:2025:01");
    expect(ref.current!.vacations[1]!.id).toBe("vac:2025:02");
  });

  it("добавление отпуска на 7 дней с 2026-06-01 содержит все даты 01–07", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2026, 6, 1),
        calendarDays: 7,
        type: "paid",
      });
    });

    const v = ref.current!.vacations[0]!;
    expect(v.startDate.toString()).toBe("2026-06-01");
    expect(v.calendarDays).toBe(7);
    expect(v.dates.map((d) => d.toString())).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
    ]);
  });

  it("updateVacation обновляет поля отпуска по vacationId", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2026, 6, 15),
        calendarDays: 7,
        type: "paid",
      });
    });

    await waitFor(() => expect(ref.current!.vacations).toHaveLength(1));
    const id = ref.current!.vacations[0]!.id;

    await act(async () => {
      await ref.current!.updateVacation({
        vacationId: id,
        calendarDays: 14,
      });
    });

    await waitFor(() =>
      expect(ref.current!.vacations[0]!.calendarDays).toBe(14),
    );
    const v = ref.current!.vacations[0]!;
    expect(v.calendarDays).toBe(14);
    expect(v.startDate.toString()).toBe("2026-06-15");
    expect(v.dates.map((d) => d.toString())).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
      "2026-06-20",
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
    ]);
  });

  it("removeVacation удаляет отпуск по vacationId", async () => {
    const { ref } = setup();
    await waitFor(() => expect(ref.current).not.toBeNull());

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 6, 14),
        calendarDays: 7,
        type: "paid",
      });
    });

    await act(async () => {
      await ref.current!.addVacation({
        startDate: localDate(2025, 8, 1),
        calendarDays: 14,
        type: "paid",
      });
    });

    await waitFor(() => expect(ref.current!.vacations).toHaveLength(2));
    const idToRemove = ref.current!.vacations[0]!.id;

    await act(async () => {
      await ref.current!.removeVacation(idToRemove);
    });

    await waitFor(() => expect(ref.current!.vacations).toHaveLength(1));
    expect(ref.current!.vacations[0]!.id).not.toBe(idToRemove);
  });
});
