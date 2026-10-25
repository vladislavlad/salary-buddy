import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type {
  Bonus,
  BonusCreateRequest,
  BonusUpdateRequest,
} from "@/shared/types";
import type { Result } from "@/shared/result";
import { BonusApplicationService } from "@/features/bonus/model/BonusApplicationService";
import type { Repository } from "@/shared/repository/Repository";

export const BONUSES_QUERY_KEY = [...LOCAL_QUERY_KEY, "bonuses"] as const;

export interface UseBonusesResult {
  bonuses: Bonus[];
  loading: boolean;
  addBonus: (req: BonusCreateRequest) => Promise<Result<Bonus>>;
  updateBonus: (req: BonusUpdateRequest) => Promise<Result<Bonus>>;
  removeBonus: (bonusId: string) => Promise<void>;
}

export function useBonusesService(
  repository: Repository<Bonus, string>,
): UseBonusesResult {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new BonusApplicationService(repository),
    [repository],
  );

  const { data: bonuses = [], isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: BONUSES_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: BONUSES_QUERY_KEY }),
    [queryClient],
  );

  const addBonus = useCallback(
    async (req: BonusCreateRequest): Promise<Result<Bonus>> => {
      const result = await service.add(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const updateBonus = useCallback(
    async (req: BonusUpdateRequest): Promise<Result<Bonus>> => {
      const result = await service.update(req);
      if (result.ok) await invalidate();
      return result;
    },
    [service, invalidate],
  );

  const removeBonus = useCallback(
    async (bonusId: string): Promise<void> => {
      await service.remove(bonusId);
      await invalidate();
    },
    [service, invalidate],
  );

  return { bonuses, loading: isFetching, addBonus, updateBonus, removeBonus };
}
