import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarData } from "@/shared/types";
import type { SickLeave, SickLeaveCreateRequest, SickLeaveUpdateRequest, SickLeaveSettings } from "@/shared/types/sick-leave";
import { SickLeaveSettingsSchema } from "@/shared/types/sick-leave";
import type { Result } from "@/shared/result";
import type { SickLeaveService } from "@/features/sick-leave/model/SickLeaveService";
import type { SickLeaveSettingsRepository } from "../repository/SickLeaveSettingsRepository";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";

export const SICK_LEAVES_QUERY_KEY = ["sick-leaves"] as const;

export type SickLeaveServiceFactory = (
  calendars: ReadonlyMap<number, CalendarData>,
) => SickLeaveService;

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

const defaultSettings = SickLeaveSettingsSchema.parse({});

export function useSickLeaves(
  createService: SickLeaveServiceFactory,
  settingsRepository: SickLeaveSettingsRepository,
): UseSickLeavesResult {
  const { calendars } = useCalendar();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SickLeaveSettings>(defaultSettings);

  // Загружаем настройки при монтировании.
  useEffect(() => {
    let cancelled = false;
    settingsRepository.get().then((saved) => {
      if (!cancelled && saved) setSettings(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [settingsRepository]);

  const service: SickLeaveService = useMemo(
    () => createService(calendars),
    [createService, calendars],
  );

  const {
    data: sickLeaves = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: SICK_LEAVES_QUERY_KEY,
    queryFn: () => service.findAll(),
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

  const updateSettingsState = useCallback(
    async (partial: Partial<SickLeaveSettings>): Promise<void> => {
      setSettings((prev) => {
        const updated = SickLeaveSettingsSchema.parse({ ...prev, ...partial });
        settingsRepository.save(updated);
        return updated;
      });
    },
    [settingsRepository],
  );

  return {
    sickLeaves,
    settings,
    loading: isLoading,
    error: error ? error.message : null,
    reload,
    addSickLeave,
    updateSickLeave,
    removeSickLeave,
    updateSettings: updateSettingsState,
  };
}
