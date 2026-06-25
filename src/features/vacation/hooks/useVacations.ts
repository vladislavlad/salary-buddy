import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarData } from "@/shared/types";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import type { Result } from "@/shared/result";
import type { VacationService } from "@/features/vacation/model/VacationService";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";

export const VACATIONS_QUERY_KEY = ["vacations"] as const;

export type VacationServiceFactory = (
  calendars: ReadonlyMap<number, CalendarData>,
) => VacationService;

export interface UseVacationsResult {
  vacations: Vacation[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  addVacation(req: VacationCreateRequest): Promise<Result<Vacation>>;
  updateVacation(req: VacationUpdateRequest): Promise<Result<Vacation>>;
  removeVacation(vacationId: string): Promise<void>;
}

export function useVacations(
  createService: VacationServiceFactory,
): UseVacationsResult {
  const { calendars } = useCalendar();
  const queryClient = useQueryClient();

  const service: VacationService = useMemo(
    () => createService(calendars),
    [createService, calendars],
  );

  const {
    data: vacations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: VACATIONS_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: VACATIONS_QUERY_KEY }),
    [queryClient],
  );

  const reload = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const addVacation = useCallback(
    async (req: VacationCreateRequest): Promise<Result<Vacation>> => {
      const result = await service.add(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const updateVacation = useCallback(
    async (req: VacationUpdateRequest): Promise<Result<Vacation>> => {
      const result = await service.update(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const removeVacation = useCallback(
    async (vacationId: string): Promise<void> => {
      await service.remove(vacationId);
      await invalidate();
    },
    [service, invalidate],
  );

  return {
    vacations,
    loading: isLoading,
    error: error ? error.message : null,
    reload,
    addVacation,
    updateVacation,
    removeVacation,
  };
}
