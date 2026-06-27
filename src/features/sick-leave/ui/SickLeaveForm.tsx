import { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DatePicker } from "@/shared/ui/datepicker";
import type { SickLeaveReason, SickLeaveExperience, LocalDate } from "@/shared/types";
import { localToday } from "@/shared/types";

const REASON_OPTIONS: { value: SickLeaveReason; label: string }[] = [
  { value: "illness", label: "Собственное заболевание" },
  { value: "work-injury", label: "Производственная травма" },
  { value: "child-care-under7", label: "Уход за ребёнком &lt; 7 лет" },
  { value: "child-care-7to15", label: "Уход за ребёнком 7–15 лет" },
];

const EXPERIENCE_OPTIONS: { value: SickLeaveExperience; label: string }[] = [
  { value: "under5", label: "&lt; 5 лет (60%)" },
  { value: "5to8", label: "5–8 лет (80%)" },
  { value: "8plus", label: "8+ лет (100%)" },
];

export function SickLeaveForm({
  initial,
  onStartDateChange,
  onSave,
  onCancel,
}: {
  initial?: {
    id: string;
    startDate: LocalDate;
    calendarDays: number;
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  };
  onStartDateChange?: (date: LocalDate) => void;
  onSave: (data: {
    sickLeaveId?: string;
    startDate: LocalDate;
    calendarDays: number;
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  }) => void;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState<LocalDate>(
    initial?.startDate ?? localToday(),
  );
  const [daysInput, setDaysInput] = useState<string>(
    String(initial?.calendarDays ?? 7),
  );
  const [reason, setReason] = useState<SickLeaveReason>(initial?.reason ?? "illness");
  const [experience, setExperience] = useState<SickLeaveExperience>(initial?.experience ?? "8plus");

  // Валидация на blur.
  const handleDaysBlur = () => {
    const parsed = parseInt(daysInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setDaysInput("1");
    }
  };

  const parsedDays = parseInt(daysInput, 10);
  const calendarDays = Math.max(1, parsedDays || 1);
  const daysError =
    daysInput.length > 0 && (isNaN(parsedDays) || parsedDays < 1);

  const canSave = !daysError;
  const isEdit = !!initial;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {isEdit ? "Редактировать больничный" : "Новый больничный"}
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
          <Label>Дата начала</Label>
          <DatePicker
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              onStartDateChange?.(date);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Количество календарных дней</Label>
          <Input
            type="number"
            min={1}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            onBlur={handleDaysBlur}
          />
          {daysError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Введите число больше нуля
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Причина</Label>
          <Select value={reason} onValueChange={(v: SickLeaveReason) => setReason(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Страховой стаж</Label>
          <Select value={experience} onValueChange={(v: SickLeaveExperience) => setExperience(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-2">
        <Button
          size="sm"
          className="w-full"
          disabled={!canSave}
          onClick={() => {
            onSave({
              sickLeaveId: initial?.id,
              startDate,
              calendarDays,
              reason,
              experience,
            });
          }}
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          {isEdit ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}
