import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { YearCalculation, CalendarData } from '@/types';
import { fetchCalendar } from '@/services/calendar';
import { calculateYear } from '@/lib/calculation-engine';
import { useSalaryProvider } from '@/hooks/useSalaryProvider';
import { useBonusesProvider } from '@/hooks/useBonusesProvider';
import { useVacationsProvider } from '@/hooks/useVacationsProvider';
import { useFactsProvider } from '@/hooks/useFactsProvider';
import { PaymentsContext } from './contexts';
import { MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR } from '@/lib/utils';

function range(from: number, to: number): number[] {
  const result: number[] = [];
  for (let y = from; y <= to; y++) {
    result.push(y);
  }
  return result;
}

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSalaryProvider();
  const { bonuses } = useBonusesProvider();
  const { vacations, vacationSettings } = useVacationsProvider();
  const { facts } = useFactsProvider();

  const displayYears = useMemo(() => range(MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR), []);

  const calendarResults = useQueries({
    queries: displayYears.map((year) => ({
      queryKey: ['calendar', year] as const,
      queryFn: () => fetchCalendar(year),
      staleTime: Infinity,
      retry: 2,
    })),
  });

  const { calendars, allLoaded } = useMemo(() => {
    const calMap = new Map<number, CalendarData>();
    let loaded = true;

    for (let i = 0; i < displayYears.length; i++) {
      const result = calendarResults[i];
      if (!result) continue;

      if (result.isLoading || result.isFetching) {
        loaded = false;
      }
      if (result.data) {
        calMap.set(displayYears[i]!, result.data);
      }
    }

    return { calendars: calMap, allLoaded: loaded };
  }, [calendarResults, displayYears]);

  const calculations = useMemo(() => {
    const results = new Map<number, YearCalculation>();
    for (const year of displayYears) {
      const calendarData = calendars.get(year) ?? null;
      const result = calculateYear(
        year,
        settings,
        bonuses,
        vacations,
        vacationSettings,
        calendarData,
        facts
      );
      results.set(year, result);
    }

    return results;
  }, [settings, bonuses, vacations, vacationSettings, facts, displayYears, calendars]);

  const value = useMemo(
    () => ({
      calculations,
      calendars,
      isLoading: !allLoaded,
      displayYears,
    }),
    [calculations, calendars, allLoaded, displayYears]
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}
