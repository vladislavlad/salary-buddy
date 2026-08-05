import { ExportImportRepositoriesContext } from "./ExportImportRepositoriesContext";
import type { ExportImportRepositories } from "@/features/import-export/model/exportImport";

export function ExportImportRepositoriesProvider({ children, value }: { children: React.ReactNode; value: ExportImportRepositories }) {
  return (
    <ExportImportRepositoriesContext.Provider value={value}>
      {children}
    </ExportImportRepositoriesContext.Provider>
  );
}
