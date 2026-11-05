// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppProviders } from "@/app/AppProviders";
import { OvertimeManager } from "@/features/overtime/ui/OvertimeManager";
import { generateFallbackCalendar } from "@/features/calendar/model/calendar-fallback";
import { MAX_DISPLAY_YEAR, MIN_DISPLAY_YEAR } from "@/shared/lib/yearSettings";
vi.mock("@/app/repositories", async () => {
  const [
    { InMemoryRepository },
    { InMemorySettingsRepository },
    { localDate },
  ] = await Promise.all([
    import("./fixtures/InMemoryRepository"),
    import("./fixtures/InMemorySettingsRepository"),
    import("@/shared/types/local-date"),
  ]);

  return {
    bonusRepository: new InMemoryRepository(),
    overtimeRepository: new InMemoryRepository(),
    paymentsRepository: new InMemoryRepository(),
    salaryRepository: new InMemoryRepository([
      {
        id: "sal:2026:01",
        amount: 22_000_000,
        effectiveDate: localDate(2026, 4, 1),
      },
    ]),
    sickLeaveRepository: new InMemoryRepository(),
    surchargeRepository: new InMemoryRepository(),
    vacationRepository: new InMemoryRepository(),
    regionalCoefficientRepository: new InMemoryRepository(),
    calendarSettingsRepository: new InMemorySettingsRepository(),
    salaryPaymentSettingsRepository: new InMemorySettingsRepository(),
    sickLeaveSettingsRepository: new InMemorySettingsRepository(),
  };
});

const queryClient = new QueryClient();

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.useRealTimers();
});

it("показывает оплату за выходной по ×2 после добавления записи", async () => {
  vi.setSystemTime(new Date(2026, 3, 17, 12));
  for (let year = MIN_DISPLAY_YEAR; year <= MAX_DISPLAY_YEAR; year++) {
    queryClient.setQueryData(["calendar", year, "covid", false], {
      data: generateFallbackCalendar(year),
      isFallback: true,
    });
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <OvertimeManager />
      </AppProviders>
    </QueryClientProvider>,
  );

  const add = await screen.findByRole("button", {
    name: "Добавить переработку",
  });
  await waitFor(() => expect(add).toHaveProperty("disabled", false));
  fireEvent.click(add);
  fireEvent.click(screen.getByRole("button", { name: "17 апреля 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "18" }));
  expect(screen.getByText("Выходной или праздник")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Ставка" }).textContent).toBe(
    "×2",
  );
  expect(screen.getByRole("spinbutton", { name: "Часы" })).toHaveProperty(
    "value",
    "8",
  );
  fireEvent.click(screen.getByRole("button", { name: "Добавить" }));

  expect(await screen.findByText("8 ч ×2")).toBeTruthy();
  expect(await screen.findByText(/^24 апреля 2026 ·/)).toBeTruthy();
  expect(screen.getByText(/20\s000\s₽/)).toBeTruthy();
});
