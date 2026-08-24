import { createContext } from "react";

export interface CalendarSettingsContextValue {
  accountForCoronavirusDays: boolean;
  loading: boolean;
}

export const CalendarSettingsContext =
  createContext<CalendarSettingsContextValue | null>(null);
