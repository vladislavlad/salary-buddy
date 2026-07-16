import { createContext } from "react";
import type { CalendarData } from "@/shared/types";

export interface CalendarContextValue {
  calendars: Map<number, CalendarData>;
  isLoading: boolean;
  displayYears: number[];
  fallbackYears: Set<number>;
}

export const CalendarContext = createContext<CalendarContextValue | null>(null);
