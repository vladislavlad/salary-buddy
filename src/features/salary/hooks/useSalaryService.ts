import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Salary } from "@/shared/types";
import { SalaryApplicationService } from "@/features/salary/model/SalaryApplicationService";
import { salaryRepository } from "@/app/repositories";

export const SALARIES_QUERY_KEY = ["salaries"] as const;

export function useSalaryService(): {
  salaries: Salary[];
  loading: boolean;
  setSalaries: (salaries: Salary[]) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new SalaryApplicationService(salaryRepository),
    [],
  );

  const { data: salaries = [], isLoading } = useQuery({
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

  return { salaries, loading: isLoading, setSalaries };
}
