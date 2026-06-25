import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { CalendarData } from "@/shared/types";
import { fetchCalendar } from "@/features/calendar/model/calendar";
import { CalendarContext } from "./CalendarContext";
import { MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR } from "@/shared/lib/utils";

function range(from: number, to: number): number[] {
  const result: number[] = [];
  for (let y = from; y <= to; y++) {
    result.push(y);
  }
  return result;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const displayYears = useMemo(
    () => range(MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR),
    [],
  );

  const calendarResults = useQueries({
    queries: displayYears.map((year) => ({
      queryKey: ["calendar", year] as const,
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

  const value = useMemo(
    () => ({ calendars, isLoading: !allLoaded, displayYears }),
    [calendars, allLoaded, displayYears],
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
