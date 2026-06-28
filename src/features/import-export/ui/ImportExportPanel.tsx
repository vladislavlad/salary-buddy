import { type ChangeEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Trash2 } from "lucide-react";

import {
  collectExportData,
  importFromFile,
} from "@/features/import-export/model/exportImport";
import { clearAll } from "@/features/import-export/model/storage";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useToast } from "@/shared/ui/use-toast";

export function ImportExportPanel() {
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAll();
      // Полная перезагрузка – гарантированно сбрасывает все стейты (react-query
      // и локальные стейты настроек), чтобы UI не остался с устаревшими данными.
      window.location.reload();
    } catch {
      setClearing(false);
      setConfirmClearOpen(false);
      toast({
        variant: "destructive",
        description: "Ошибка при очистке данных",
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
        <Download className="w-4 h-4" />
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
        <Upload className="w-4 h-4" />
        Загрузить
      </Button>

      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmClearOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
        Очистить данные
      </Button>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Очистить все данные?</DialogTitle>
            <DialogDescription>
              Будут удалены все данные: оклад, премии, отпуска, больничные и
              настройки. Действие необратимо. Если данные нужны – сначала
              сохраните их через «Сохранить».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmClearOpen(false)}
              disabled={clearing}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={clearing}
            >
              <Trash2 className="w-4 h-4" />
              Очистить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
