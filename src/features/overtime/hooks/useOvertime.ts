import { useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_QUERY_KEY,
  LOCAL_QUERY_OPTIONS,
} from "@/shared/query/localQuery";
import type { Repository } from "@/shared/repository/Repository";
import { OvertimeContext } from "../model/OvertimeContext";
import { OvertimeApplicationService } from "../model/OvertimeApplicationService";
import type { Overtime, OvertimeInput } from "../model/overtime";

const OVERTIME_QUERY_KEY = [...LOCAL_QUERY_KEY, "overtime"] as const;
const EMPTY_OVERTIME: Overtime[] = [];

export function useOvertimeService(repository: Repository<Overtime>) {
  const queryClient = useQueryClient();
  const service = useMemo(
    () => new OvertimeApplicationService(repository),
    [repository],
  );
  const { data = EMPTY_OVERTIME, isFetching } = useQuery({
    ...LOCAL_QUERY_OPTIONS,
    queryKey: OVERTIME_QUERY_KEY,
    queryFn: () => service.findAll(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: OVERTIME_QUERY_KEY });
  const save = useMutation({
    ...LOCAL_QUERY_OPTIONS,
    mutationFn: ({ input, id }: { input: OvertimeInput; id?: string }) =>
      service.save(input, id),
    onSuccess: (result) => (result.ok ? invalidate() : undefined),
  });
  const remove = useMutation({
    ...LOCAL_QUERY_OPTIONS,
    mutationFn: (id: string) => service.remove(id),
    onSuccess: invalidate,
  });

  return {
    overtime: data,
    loading: isFetching,
    saveOvertime: save.mutateAsync,
    removeOvertime: remove.mutateAsync,
    saving: save.isPending || remove.isPending,
  };
}

export function useOvertime() {
  const context = useContext(OvertimeContext);
  if (!context)
    throw new Error(
      "useOvertime должен использоваться внутри OvertimeProvider",
    );
  return context;
}
