import { useState } from "react";
import { X, Check } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/datepicker";
import { NumberField } from "@/shared/ui/numberfield";
import type { RegionalCoefficientChange, LocalDate } from "@/shared/types";
import { localToday } from "@/shared/types";

export function RegionalCoefficientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: RegionalCoefficientChange;
  onSave: (data: Omit<RegionalCoefficientChange, "id"> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState<LocalDate>(
    initial?.effectiveDate ?? localToday(),
  );
  const [percent, setPercent] = useState(initial?.percent ?? 0);

  const canSave = percent >= 0 && percent <= 100;
  const isEdit = !!initial;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {isEdit ? "Редактировать коэффициент" : "Новый коэффициент"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCancel}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-2">
          <Label>Дата</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <NumberField
          label="Процент (%)"
          value={percent}
          min={0}
          max={100}
          onChange={setPercent}
        />
      </div>
      <div className="pt-2">
        <Button
          size="sm"
          className="w-full"
          disabled={!canSave}
          onClick={() => onSave({ id: initial?.id, effectiveDate: date, percent })}
        >
          <Check className="w-3.5 h-3.5" />
          {isEdit ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}
