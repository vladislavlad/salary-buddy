import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LOCAL_QUERY_KEY } from "@/shared/query/localQuery";
import { useExportImportRepositories } from "../model/ExportImportRepositoriesContext";
import {
  clearAll,
  collectExportData,
  importFromFile,
} from "../model/exportImport";

export function useImportExport() {
  const repositories = useExportImportRepositories();
  const queryClient = useQueryClient();

  const exportData = useCallback(
    () => collectExportData(repositories),
    [repositories],
  );

  const importData = useCallback(
    async (file: File) => {
      await importFromFile(file, repositories);
      await queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEY });
    },
    [repositories, queryClient],
  );

  const clearData = useCallback(() => clearAll(repositories), [repositories]);

  return { exportData, importData, clearData };
}
