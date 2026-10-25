import { useQuery } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type { CalendarSettings } from "@/shared/types";
import type { CalendarSettingsRepository } from "@/features/calendar/repository/CalendarSettingsRepository";

export const CALENDAR_SETTINGS_QUERY_KEY = [
  ...LOCAL_QUERY_KEY,
  "calendar-settings",
] as const;

// Единственный реализуемый режим – «без учёта ковидных дней».
const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  accountForCoronavirusDays: false,
};

/** Настройка «учитывать ковидные дни»; значение по умолчанию – «нет». */
export function useCalendarSettings(repository: CalendarSettingsRepository) {
  const { data, isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: CALENDAR_SETTINGS_QUERY_KEY,
    queryFn: () => repository.get(),
  });

  const settings = data ?? DEFAULT_CALENDAR_SETTINGS;
  return {
    accountForCoronavirusDays: settings.accountForCoronavirusDays,
    loading: isFetching,
  };
}
