import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type {
  RegionalCoefficientChange,
  RegionalCoefficientCreateRequest,
  RegionalCoefficientUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";
import { RegionalCoefficientApplicationService } from "@/features/regional-coefficient/model/RegionalCoefficientApplicationService";
import type { Repository } from "@/shared/repository/Repository";

export const REGIONAL_COEFFICIENTS_QUERY_KEY = [
  ...LOCAL_QUERY_KEY,
  "regionalCoefficients",
] as const;

export interface UseRegionalCoefficientResult {
  coefficients: RegionalCoefficientChange[];
  loading: boolean;
  addCoefficient: (
    req: RegionalCoefficientCreateRequest,
  ) => Promise<Result<RegionalCoefficientChange>>;
  updateCoefficient: (
    req: RegionalCoefficientUpdateRequest,
  ) => Promise<Result<RegionalCoefficientChange>>;
  removeCoefficient: (coefficientId: string) => Promise<void>;
}

export function useRegionalCoefficientService(
  repository: Repository<RegionalCoefficientChange, string>,
): UseRegionalCoefficientResult {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new RegionalCoefficientApplicationService(repository),
    [repository],
  );

  const { data: coefficients = [], isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: REGIONAL_COEFFICIENTS_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: REGIONAL_COEFFICIENTS_QUERY_KEY,
      }),
    [queryClient],
  );

  const addCoefficient = useCallback(
    async (
      req: RegionalCoefficientCreateRequest,
    ): Promise<Result<RegionalCoefficientChange>> => {
      const result = await service.add(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const updateCoefficient = useCallback(
    async (
      req: RegionalCoefficientUpdateRequest,
    ): Promise<Result<RegionalCoefficientChange>> => {
      const result = await service.update(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const removeCoefficient = useCallback(
    async (coefficientId: string): Promise<void> => {
      await service.remove(coefficientId);
      await invalidate();
    },
    [service, invalidate],
  );

  return {
    coefficients,
    loading: isFetching,
    addCoefficient,
    updateCoefficient,
    removeCoefficient,
  };
}
