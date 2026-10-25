import { useContext } from "react";
import {
  CalendarSettingsContext,
  type CalendarSettingsContextValue,
} from "../model/CalendarSettingsContext";

export function useCalendarSettingsProvider(): CalendarSettingsContextValue {
  const ctx = useContext(CalendarSettingsContext);
  if (!ctx) {
    throw new Error(
      "useCalendarSettingsProvider must be used within CalendarSettingsProvider",
    );
  }
  return ctx;
}
