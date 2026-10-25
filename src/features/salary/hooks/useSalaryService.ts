import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type { Salary } from "@/shared/types";
import { SalaryApplicationService } from "@/features/salary/model/SalaryApplicationService";
import type { Repository } from "@/shared/repository/Repository";

export const SALARIES_QUERY_KEY = [...LOCAL_QUERY_KEY, "salaries"] as const;

export function useSalaryService(repository: Repository<Salary, string>): {
  salaries: Salary[];
  loading: boolean;
  setSalaries: (salaries: Salary[]) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new SalaryApplicationService(repository),
    [repository],
  );

  const { data: salaries = [], isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: SALARIES_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const setSalaries = useCallback(
    async (next: Salary[]) => {
      await service.saveAll(next);
      await queryClient.invalidateQueries({ queryKey: SALARIES_QUERY_KEY });
    },
    [service, queryClient],
  );

  return { salaries, loading: isFetching, setSalaries };
}
