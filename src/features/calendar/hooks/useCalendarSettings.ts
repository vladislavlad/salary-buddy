import { useQuery } from "@tanstack/react-query";
import type { CalendarSettings } from "@/shared/types";
import { calendarSettingsRepository } from "@/app/repositories";
import type { CalendarSettingsRepository } from "@/features/calendar/repository/CalendarSettingsRepository";

export const CALENDAR_SETTINGS_QUERY_KEY = ["calendar-settings"] as const;

// Единственный реализуемый режим – «без учёта ковидных дней».
const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  accountForCoronavirusDays: false,
};

/** Настройка «учитывать ковидные дни»; значение по умолчанию – «нет». */
export function useCalendarSettings(
  repository: CalendarSettingsRepository = calendarSettingsRepository,
) {
  const { data, isLoading } = useQuery({
    queryKey: CALENDAR_SETTINGS_QUERY_KEY,
    queryFn: () => repository.get(),
  });

  const settings = data ?? DEFAULT_CALENDAR_SETTINGS;
  return {
    accountForCoronavirusDays: settings.accountForCoronavirusDays,
    loading: isLoading,
  };
}
