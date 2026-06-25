import { type ChangeEvent, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";

import {
  collectExportData,
  importFromFile,
} from "@/features/import-export/model/exportImport";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/shared/ui/use-toast";

export function ImportExportPanel() {
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      const data = await collectExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      a.href = url;
      a.download = `salary-buddy-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ description: "Данные сохранены" });
    } catch {
      toast({
        variant: "destructive",
        description: "Ошибка при экспорте данных",
      });
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importFromFile(file);
      await queryClient.invalidateQueries();
      toast({
        variant: "success",
        description: "Данные загружены",
      });
    } catch {
      toast({
        variant: "destructive",
        description:
          "Ошибка при импорте данных. Убедитесь, что файл содержит корректные данные Salary Buddy.",
      });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleExport}>
        <Download className="w-4 h-4 mr-2" />
        Сохранить
      </Button>
      <input
        ref={importRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <Button variant="outline" onClick={() => importRef.current?.click()}>
        <Upload className="w-4 h-4 mr-2" />
        Загрузить
      </Button>
    </div>
  );
}
