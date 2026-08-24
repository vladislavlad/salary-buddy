import { CalendarSettingsContext } from "./CalendarSettingsContext";
import { useCalendarSettings } from "@/features/calendar/hooks/useCalendarSettings";
import { calendarSettingsRepository } from "@/app/repositories";
import type { CalendarSettingsRepository } from "@/features/calendar/repository/CalendarSettingsRepository";

export function CalendarSettingsProvider({
  children,
  repository = calendarSettingsRepository,
}: {
  children: React.ReactNode;
  repository?: CalendarSettingsRepository;
}) {
  const value = useCalendarSettings(repository);
  return (
    <CalendarSettingsContext.Provider value={value}>
      {children}
    </CalendarSettingsContext.Provider>
  );
}
