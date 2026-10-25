import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type {
  SickLeave,
  SickLeaveCreateRequest,
  SickLeaveUpdateRequest,
  SickLeaveSettings,
} from "@/shared/types/sick-leave";
import type { Result } from "@/shared/result";
import { SickLeaveApplicationService } from "../model/SickLeaveApplicationService";
import {
  DEFAULT_SICK_LEAVE_SETTINGS,
  SickLeaveSettingsApplicationService,
} from "../model/SickLeaveSettingsApplicationService";
import type { SickLeaveSettingsRepository } from "../repository/SickLeaveSettingsRepository";
import type { Repository } from "@/shared/repository/Repository";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";

export const SICK_LEAVES_QUERY_KEY = [
  ...LOCAL_QUERY_KEY,
  "sick-leaves",
] as const;
export const SICK_LEAVE_SETTINGS_QUERY_KEY = [
  ...LOCAL_QUERY_KEY,
  "sick-leave-settings",
] as const;

interface UseSickLeavesResult {
  sickLeaves: SickLeave[];
  settings: SickLeaveSettings;
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  addSickLeave(req: SickLeaveCreateRequest): Promise<Result<SickLeave>>;
  updateSickLeave(req: SickLeaveUpdateRequest): Promise<Result<SickLeave>>;
  removeSickLeave(sickLeaveId: string): Promise<void>;
  updateSettings(settings: Partial<SickLeaveSettings>): Promise<void>;
}

export function useSickLeaves(
  repository: Repository<SickLeave, string>,
  settingsRepository: SickLeaveSettingsRepository,
): UseSickLeavesResult {
  const { calendars } = useCalendar();
  const queryClient = useQueryClient();

  // Сервис пересоздаётся при смене календарей: валидация дат зависит от выходных
  const service = useMemo(
    () => new SickLeaveApplicationService(repository, calendars),
    [repository, calendars],
  );

  const settingsService = useMemo(
    () => new SickLeaveSettingsApplicationService(settingsRepository),
    [settingsRepository],
  );

  const {
    data: sickLeaves = [],
    isFetching,
    error,
  } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: SICK_LEAVES_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const {
    data: settings = DEFAULT_SICK_LEAVE_SETTINGS,
    isFetching: settingsLoading,
  } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: SICK_LEAVE_SETTINGS_QUERY_KEY,
    queryFn: () => settingsService.getSettings(),
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SICK_LEAVES_QUERY_KEY }),
    [queryClient],
  );

  const reload = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const addSickLeave = useCallback(
    async (req: SickLeaveCreateRequest): Promise<Result<SickLeave>> => {
      const result = await service.add(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const updateSickLeave = useCallback(
    async (req: SickLeaveUpdateRequest): Promise<Result<SickLeave>> => {
      const result = await service.update(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const removeSickLeave = useCallback(
    async (sickLeaveId: string): Promise<void> => {
      await service.remove(sickLeaveId);
      await invalidate();
    },
    [service, invalidate],
  );

  const updateSettings = useCallback(
    async (partial: Partial<SickLeaveSettings>): Promise<void> => {
      await settingsService.updateSettings(partial);
      await queryClient.invalidateQueries({
        queryKey: SICK_LEAVE_SETTINGS_QUERY_KEY,
      });
    },
    [settingsService, queryClient],
  );

  // loading покрывает и список, и настройки: PaymentsProvider стартует
  // пересчёт только когда все источники загружены
  return {
    sickLeaves,
    settings,
    loading: isFetching || settingsLoading,
    error: error ? error.message : null,
    reload,
    addSickLeave,
    updateSickLeave,
    removeSickLeave,
    updateSettings,
  };
}
