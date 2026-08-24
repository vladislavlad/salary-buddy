import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { CalendarData } from "@/shared/types";
import { fetchCalendar } from "@/features/calendar/model/calendar";
import { useCalendarSettings } from "@/features/calendar/hooks/useCalendarSettings";
import { CalendarContext } from "./CalendarContext";
import { MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR } from "@/shared/lib/yearSettings";

function range(from: number, to: number): number[] {
  const result: number[] = [];
  for (let y = from; y <= to; y++) {
    result.push(y);
  }
  return result;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { accountForCoronavirusDays } = useCalendarSettings();
  const displayYears = useMemo(
    () => range(MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR),
    [],
  );

  const calendarResults = useQueries({
    queries: displayYears.map((year) => ({
      queryKey: ["calendar", year, "covid", accountForCoronavirusDays] as const,
      queryFn: () => fetchCalendar(year, accountForCoronavirusDays),
      staleTime: Infinity,
      retry: 2,
    })),
  });

  const { calendars, fallbackYears, allLoaded } = useMemo(() => {
    const calMap = new Map<number, CalendarData>();
    const fbSet = new Set<number>();
    let loaded = true;

    for (let i = 0; i < displayYears.length; i++) {
      const result = calendarResults[i];
      if (!result) continue;

      if (result.isLoading || result.isFetching) {
        loaded = false;
      }
      if (result.data) {
        calMap.set(displayYears[i]!, result.data.data);
        if (result.data.isFallback) {
          fbSet.add(displayYears[i]!);
        }
      }
    }

    return { calendars: calMap, fallbackYears: fbSet, allLoaded: loaded };
  }, [calendarResults, displayYears]);

  const value = useMemo(
    () => ({ calendars, fallbackYears, isLoading: !allLoaded, displayYears }),
    [calendars, fallbackYears, allLoaded, displayYears],
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
