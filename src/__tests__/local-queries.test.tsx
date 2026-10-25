// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { CalendarContext } from "@/features/calendar/model/CalendarContext";
import { useCalendarSettings } from "@/features/calendar/hooks/useCalendarSettings";
import { CalendarProvider } from "@/features/calendar/model/CalendarProvider";
import { CalendarSettingsProvider } from "@/features/calendar/model/CalendarSettingsProvider";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";
import { useBonusesService } from "@/features/bonus/hooks/useBonuses";
import { useSalaryService } from "@/features/salary/hooks/useSalaryService";
import { useSurchargeService } from "@/features/surcharge/hooks/useSurcharge";
import { useRegionalCoefficientService } from "@/features/regional-coefficient/hooks/useRegionalCoefficient";
import { useVacations } from "@/features/vacation/hooks/useVacations";
import { useSickLeaves } from "@/features/sick-leave/hooks/useSickLeaves";
import { useSalaryPaymentSettingsService } from "@/features/salary-payment-settings/hooks/useSalaryPaymentSettingsService";
import {
  collectExportData,
  type ExportImportRepositories,
} from "@/features/import-export/model/exportImport";
import { ExportImportRepositoriesProvider } from "@/features/import-export/model/ExportImportRepositoriesProvider";
import { useImportExport } from "@/features/import-export/hooks/useImportExport";
import { DEFAULT_SALARY_PAYMENT_SETTINGS } from "@/features/salary-payment-settings/model/defaultSalaryPaymentSettings";
import { LOCAL_QUERY_KEY } from "@/shared/query/localQuery";
import type {
  CalendarSettings,
  Salary,
  SickLeaveSettings,
} from "@/shared/types";
import { localDate } from "@/shared/types/local-date";
import { InMemoryRepository } from "./fixtures/InMemoryRepository";
import { InMemorySettingsRepository } from "./fixtures/InMemorySettingsRepository";
import { loadCalendars } from "./fixtures/calendars";

const clients: QueryClient[] = [];
const calendars = loadCalendars(2026);
const salary: Salary = {
  id: "salary:2026:01",
  effectiveDate: localDate(2026, 1, 1),
  amount: 10_000_000,
};

function setup(overrides: Partial<ExportImportRepositories> = {}) {
  const repositories: ExportImportRepositories = {
    salary: new InMemoryRepository([salary]),
    bonus: new InMemoryRepository(),
    surcharge: new InMemoryRepository(),
    regionalCoefficient: new InMemoryRepository(),
    vacation: new InMemoryRepository(),
    sickLeave: new InMemoryRepository(),
    payment: new InMemoryRepository(),
    salaryPaymentSettings: new InMemorySettingsRepository({
      ...DEFAULT_SALARY_PAYMENT_SETTINGS,
      advancePaymentDay: 22,
    }),
    sickLeaveSettings: new InMemorySettingsRepository({
      enableTopUp: true,
      topUpDaysLimitPerYear: 30,
    }),
    ...overrides,
  };
  const calendarSettings = new InMemorySettingsRepository<CalendarSettings>({
    accountForCoronavirusDays: true,
  });
  const queryClient = new QueryClient();
  clients.push(queryClient);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ExportImportRepositoriesProvider value={repositories}>
          <CalendarContext.Provider
            value={{
              calendars,
              isLoading: false,
              displayYears: [2026],
              fallbackYears: new Set(),
            }}
          >
            {children}
          </CalendarContext.Provider>
        </ExportImportRepositoriesProvider>
      </QueryClientProvider>
    );
  }

  const hook = renderHook(
    () => ({
      salary: useSalaryService(repositories.salary),
      bonus: useBonusesService(repositories.bonus),
      surcharge: useSurchargeService(repositories.surcharge),
      coefficient: useRegionalCoefficientService(
        repositories.regionalCoefficient,
      ),
      vacation: useVacations(repositories.vacation),
      sickLeave: useSickLeaves(
        repositories.sickLeave,
        repositories.sickLeaveSettings,
      ),
      paymentSettings: useSalaryPaymentSettingsService(
        repositories.salaryPaymentSettings,
      ),
      calendarSettings: useCalendarSettings(calendarSettings),
      importExport: useImportExport(),
    }),
    { wrapper: Wrapper },
  );

  return { ...hook, queryClient, repositories };
}

afterEach(() => {
  cleanup();
  for (const client of clients) client.clear();
  clients.length = 0;
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
});

describe("Локальные асинхронные данные", () => {
  it("отмечает незавершённую загрузку сетевых календарей без интернета", async () => {
    onlineManager.setOnline(false);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Сеть в тесте запрещена"));
    const queryClient = new QueryClient();
    clients.push(queryClient);
    const repository = new InMemorySettingsRepository<CalendarSettings>({
      accountForCoronavirusDays: false,
    });

    const { result } = renderHook(() => useCalendar(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <CalendarSettingsProvider repository={repository}>
            <CalendarProvider>{children}</CalendarProvider>
          </CalendarSettingsProvider>
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryState([...LOCAL_QUERY_KEY, "calendar-settings"])
          ?.status,
      ).toBe("success");
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["calendar"] });
      expect(queries.length).toBeGreaterThan(0);
      expect(
        queries.every((query) => query.state.fetchStatus === "paused"),
      ).toBe(true);
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.calendars.size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ожидает настройки больничных даже после загрузки списка", async () => {
    let finishLoading: (settings: SickLeaveSettings) => void = () => undefined;
    const pending = new Promise<SickLeaveSettings>((resolve) => {
      finishLoading = resolve;
    });
    const repository = new InMemorySettingsRepository<SickLeaveSettings>();
    vi.spyOn(repository, "get").mockReturnValue(pending);
    const { result, queryClient } = setup({ sickLeaveSettings: repository });

    await waitFor(() => {
      expect(
        queryClient.getQueryState([...LOCAL_QUERY_KEY, "sick-leaves"])?.status,
      ).toBe("success");
    });
    expect(result.current.sickLeave.loading).toBe(true);

    await act(async () => {
      finishLoading({ enableTopUp: true, topUpDaysLimitPerYear: 15 });
      await pending;
    });
    await waitFor(() => expect(result.current.sickLeave.loading).toBe(false));
    expect(result.current.sickLeave.settings.enableTopUp).toBe(true);
    expect(result.current.sickLeave.settings.topUpDaysLimitPerYear).toBe(15);
  });

  it("загружает все локальные источники без интернета", async () => {
    onlineManager.setOnline(false);
    const { result, queryClient } = setup();

    await waitFor(() => {
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: LOCAL_QUERY_KEY });
      expect(queries).toHaveLength(9);
      expect(queries.every((query) => query.state.status === "success")).toBe(
        true,
      );
    });
    await waitFor(() => {
      expect(result.current.salary.salaries).toEqual([salary]);
      expect(
        result.current.paymentSettings.paymentSettings.advancePaymentDay,
      ).toBe(22);
      expect(result.current.sickLeave.settings).toEqual({
        enableTopUp: true,
        topUpDaysLimitPerYear: 30,
      });
      expect(result.current.calendarSettings.accountForCoronavirusDays).toBe(
        true,
      );
      expect(
        Object.values(result.current).every(
          (feature) => !("loading" in feature) || !feature.loading,
        ),
      ).toBe(true);
    });

    await act(async () => {
      await result.current.salary.setSalaries([
        { ...salary, amount: 12_000_000 },
      ]);
      await result.current.sickLeave.updateSettings({
        topUpDaysLimitPerYear: 15,
      });
    });
    await waitFor(() => {
      expect(result.current.salary.salaries[0]?.amount).toBe(12_000_000);
      expect(result.current.sickLeave.settings.topUpDaysLimitPerYear).toBe(15);
    });

    await act(async () => {
      await Promise.all([
        result.current.sickLeave.updateSettings({ enableTopUp: false }),
        result.current.sickLeave.updateSettings({ topUpDaysLimitPerYear: 9 }),
      ]);
    });
    await waitFor(() =>
      expect(result.current.sickLeave.settings).toEqual({
        enableTopUp: false,
        topUpDaysLimitPerYear: 9,
      }),
    );
  });

  it("ошибку локального чтения возвращает без автоматических повторов", async () => {
    const repository = new InMemoryRepository<Salary>();
    const read = vi
      .spyOn(repository, "findAll")
      .mockRejectedValue(new Error("Ошибка чтения"));
    const { queryClient } = setup({ salary: repository });

    await waitFor(() => {
      expect(
        queryClient.getQueryState([...LOCAL_QUERY_KEY, "salaries"])?.status,
      ).toBe("error");
    });
    expect(read).toHaveBeenCalledOnce();
  });

  it("во время обновления сохраняет прежние данные и сообщает о загрузке", async () => {
    const { result, repositories, queryClient } = setup();
    await waitFor(() =>
      expect(result.current.salary.salaries).toEqual([salary]),
    );

    let finishLoading: (salaries: Salary[]) => void = () => undefined;
    const pending = new Promise<Salary[]>((resolve) => {
      finishLoading = resolve;
    });
    vi.spyOn(repositories.salary, "findAll").mockReturnValueOnce(pending);
    let refresh: Promise<void> = Promise.resolve();
    act(() => {
      refresh = queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
    });

    await waitFor(() => expect(result.current.salary.loading).toBe(true));
    expect(result.current.salary.salaries).toEqual([salary]);

    await act(async () => {
      finishLoading([{ ...salary, amount: 17_000_000 }]);
      await refresh;
    });
    await waitFor(() => {
      expect(result.current.salary.loading).toBe(false);
      expect(result.current.salary.salaries[0]?.amount).toBe(17_000_000);
    });
  });

  it("после импорта обновляет данные и настройки без перезагрузки календарей", async () => {
    const { result, queryClient, repositories } = setup();
    await waitFor(() => expect(result.current.sickLeave.loading).toBe(false));
    const readCalendar = vi.fn(async () => calendars.get(2026)!);
    await queryClient.fetchQuery({
      queryKey: ["calendar", 2026],
      queryFn: readCalendar,
    });
    const exported = await collectExportData(repositories);
    exported.salaries = [{ ...salary, amount: 15_000_000 }];
    exported.sickLeaveSettings = {
      enableTopUp: false,
      topUpDaysLimitPerYear: 7,
    };
    exported.salaryPaymentSettings.advancePaymentDay = 18;
    const file = { text: async () => JSON.stringify(exported) } as File;

    await act(async () => {
      await result.current.importExport.importData(file);
    });

    await waitFor(() => {
      expect(result.current.salary.salaries[0]?.amount).toBe(15_000_000);
      expect(result.current.sickLeave.settings).toEqual(
        exported.sickLeaveSettings,
      );
      expect(
        result.current.paymentSettings.paymentSettings.advancePaymentDay,
      ).toBe(18);
    });
    expect(readCalendar).toHaveBeenCalledOnce();
    expect(queryClient.getQueryState(["calendar", 2026])?.isInvalidated).toBe(
      false,
    );
  });
});
