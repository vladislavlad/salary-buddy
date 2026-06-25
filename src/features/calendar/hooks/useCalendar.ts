import { useContext } from "react";
import { CalendarContext } from "@/features/calendar/model/CalendarContext";

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx)
    throw new Error("useCalendars must be used within CalendarProvider");
  return ctx;
}
