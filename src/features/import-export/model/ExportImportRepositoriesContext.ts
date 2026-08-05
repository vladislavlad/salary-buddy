import { createContext, useContext } from "react";
import type { ExportImportRepositories } from "@/features/import-export/model/exportImport";

export const ExportImportRepositoriesContext = createContext<ExportImportRepositories | null>(null);

export function useExportImportRepositories(): ExportImportRepositories {
  const ctx = useContext(ExportImportRepositoriesContext);
  if (!ctx) {
    throw new Error("useExportImportRepositories должен быть вызван внутри ExportImportRepositoriesProvider");
  }
  return ctx;
}
