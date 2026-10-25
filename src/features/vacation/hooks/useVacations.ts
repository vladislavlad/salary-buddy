import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type {
  Vacation,
  VacationCreateRequest,
  VacationUpdateRequest,
} from "@/shared/types/vacation";
import type { Result } from "@/shared/result";
import { VacationApplicationService } from "@/features/vacation/model/VacationApplicationService";
import type { Repository } from "@/shared/repository/Repository";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";

export const VACATIONS_QUERY_KEY = [...LOCAL_QUERY_KEY, "vacations"] as const;

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
  repository: Repository<Vacation, string>,
): UseVacationsResult {
  const { calendars } = useCalendar();
  const queryClient = useQueryClient();

  // Сервис пересоздаётся при смене календарей: даты отпусков зависят от выходных
  const service = useMemo(
    () => new VacationApplicationService(repository, calendars),
    [repository, calendars],
  );

  const {
    data: vacations = [],
    isFetching,
    error,
  } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
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
    loading: isFetching,
    error: error ? error.message : null,
    reload,
    addVacation,
    updateVacation,
    removeVacation,
  };
}
