import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type {
  SurchargeChange,
  SurchargeCreateRequest,
  SurchargeUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";
import { SurchargeApplicationService } from "@/features/surcharge/model/SurchargeApplicationService";
import type { Repository } from "@/shared/repository/Repository";

export const SURCHARGES_QUERY_KEY = [...LOCAL_QUERY_KEY, "surcharges"] as const;

export interface UseSurchargeResult {
  surcharges: SurchargeChange[];
  loading: boolean;
  addSurcharge: (
    req: SurchargeCreateRequest,
  ) => Promise<Result<SurchargeChange>>;
  updateSurcharge: (
    req: SurchargeUpdateRequest,
  ) => Promise<Result<SurchargeChange>>;
  removeSurcharge: (surchargeId: string) => Promise<void>;
}

export function useSurchargeService(
  repository: Repository<SurchargeChange, string>,
): UseSurchargeResult {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new SurchargeApplicationService(repository),
    [repository],
  );

  const { data: surcharges = [], isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: SURCHARGES_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SURCHARGES_QUERY_KEY }),
    [queryClient],
  );

  const addSurcharge = useCallback(
    async (req: SurchargeCreateRequest): Promise<Result<SurchargeChange>> => {
      const result = await service.add(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const updateSurcharge = useCallback(
    async (req: SurchargeUpdateRequest): Promise<Result<SurchargeChange>> => {
      const result = await service.update(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const removeSurcharge = useCallback(
    async (surchargeId: string): Promise<void> => {
      await service.remove(surchargeId);
      await invalidate();
    },
    [service, invalidate],
  );

  return {
    surcharges,
    loading: isFetching,
    addSurcharge,
    updateSurcharge,
    removeSurcharge,
  };
}
