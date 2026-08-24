// @vitest-environment jsdom
import { useContext } from "react";
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CalendarSettingsProvider } from "@/features/calendar/model/CalendarSettingsProvider";
import {
  CalendarSettingsContext,
  type CalendarSettingsContextValue,
} from "@/features/calendar/model/CalendarSettingsContext";
import type { CalendarSettingsRepository } from "@/features/calendar/repository/CalendarSettingsRepository";
import type { CalendarSettings } from "@/shared/types";

/** Заглушка репозитория: фиксированное значение без localStorage. */
class FakeCalendarSettingsRepository implements CalendarSettingsRepository {
  constructor(private settings: CalendarSettings | null = null) {}

  get(): Promise<CalendarSettings | null> {
    return Promise.resolve(this.settings);
  }

  async save(): Promise<void> {
    // noop
  }

  async clear(): Promise<void> {
    // noop
  }
}

/** Компонент-потребитель, экспонирует контекст через внешний объект. */
function ContextConsumer({
  exposeRef,
}: {
  exposeRef: { current: CalendarSettingsContextValue | null };
}) {
  const ctx = useContext(CalendarSettingsContext);
  if (ctx) exposeRef.current = ctx;
  return <span />;
}

function renderWithSettings(
  repository: CalendarSettingsRepository,
): { ref: { current: CalendarSettingsContextValue | null } } {
  const ref: { current: CalendarSettingsContextValue | null } = {
    current: null,
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CalendarSettingsProvider repository={repository}>
        <ContextConsumer exposeRef={ref} />
      </CalendarSettingsProvider>
    </QueryClientProvider>,
  );

  return { ref };
}

describe("CalendarSettingsProvider", () => {
  it("по умолчанию ковидные дни не учитываются", async () => {
    const { ref } = renderWithSettings(new FakeCalendarSettingsRepository(null));

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
      expect(ref.current!.loading).toBe(false);
    });
    expect(ref.current!.accountForCoronavirusDays).toBe(false);
  });

  it("сохранённое значение восстанавливается из репозитория", async () => {
    const repository = new FakeCalendarSettingsRepository({
      accountForCoronavirusDays: true,
    });
    const { ref } = renderWithSettings(repository);

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
      expect(ref.current!.loading).toBe(false);
    });
    expect(ref.current!.accountForCoronavirusDays).toBe(true);
  });

  it("несохранённое значение (null из репозитория) – режим «без учёта»", async () => {
    const { ref } = renderWithSettings(new FakeCalendarSettingsRepository());

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });
    expect(ref.current!.accountForCoronavirusDays).toBe(false);
  });
});
