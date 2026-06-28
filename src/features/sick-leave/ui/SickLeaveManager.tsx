import { useState, useEffect } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Plus, Info } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import type { SickLeaveReason, SickLeaveExperience, LocalDate } from "@/shared/types";
import { useSickLeavesProvider } from "../hooks/useSickLeavesProvider";
import { SickLeaveForm } from "./SickLeaveForm";
import { SickLeaveCard } from "./SickLeaveCard";

export function SickLeaveManager() {
  const {
    sickLeaves,
    settings,
    addSickLeave,
    updateSickLeave,
    removeSickLeave,
    updateSettings,
  } = useSickLeavesProvider();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Локальное строковое состояние инпута лимита дней – чтобы поле можно было
  // очистить до пустого (число коммитим в настройки только при валидном вводе).
  const [topUpDaysInput, setTopUpDaysInput] = useState<string>(
    String(settings.topUpDaysLimitPerYear),
  );

  // Синхронизация при загрузке настроек из хранилища (внешнее изменение значения),
  // не затирая то, что пользователь сейчас вводит (включая пустую строку).
  useEffect(() => {
    setTopUpDaysInput((prev) =>
      parseInt(prev, 10) === settings.topUpDaysLimitPerYear
        ? prev
        : String(settings.topUpDaysLimitPerYear),
    );
  }, [settings.topUpDaysLimitPerYear]);

  const handleTopUpDaysChange = (raw: string) => {
    setTopUpDaysInput(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1) {
      updateSettings({ topUpDaysLimitPerYear: val });
    }
  };

  // При потере фокуса с пустым/некорректным значением – возвращаем последнее валидное.
  const handleTopUpDaysBlur = () => {
    const val = parseInt(topUpDaysInput, 10);
    if (isNaN(val) || val < 1) {
      setTopUpDaysInput(String(settings.topUpDaysLimitPerYear));
    }
  };

  const sortedSickLeaves = [...sickLeaves].sort((a, b) =>
    Temporal.PlainDate.compare(a.startDate, b.startDate),
  );

  const handleSave = async (data: {
    sickLeaveId?: string;
    startDate: LocalDate;
    calendarDays: number;
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  }) => {
    if (data.sickLeaveId) {
      await updateSickLeave({
        sickLeaveId: data.sickLeaveId,
        startDate: data.startDate,
        calendarDays: data.calendarDays,
        reason: data.reason,
        experience: data.experience,
      });
    } else {
      await addSickLeave({
        startDate: data.startDate,
        calendarDays: data.calendarDays,
        reason: data.reason,
        experience: data.experience,
      });
    }
    setEditingId(null);
    setAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    await removeSickLeave(id);
  };

  return (
    <div className="space-y-4">
      {/* Настройки больничных */}
      <div className="rounded-lg border bg-card-secondary p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Доплата до полного оклада</Label>
            <p className="text-xs text-muted-foreground font-normal">
              Работодатель доплачивает разницу между пособием и окладом
            </p>
          </div>
          <Switch
            checked={settings.enableTopUp}
            onCheckedChange={(checked) => updateSettings({ enableTopUp: checked })}
          />
        </div>

        {settings.enableTopUp && (
          <div className="space-y-2">
            <Label>Количество дней с доплатой в году</Label>
            <Input
              type="number"
              min={1}
              value={topUpDaysInput}
              onChange={(e) => handleTopUpDaysChange(e.target.value)}
              onBlur={handleTopUpDaysBlur}
            />
          </div>
        )}
      </div>

      {/* Список больничных */}
      {sortedSickLeaves.length > 0 && (
        <div className="space-y-1.5">
          {sortedSickLeaves.map((s) => (
            <SickLeaveCard
              key={s.id}
              sickLeave={s}
              isEditing={editingId === s.id}
              onEdit={(id) => setEditingId(id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}

      {sortedSickLeaves.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Добавьте первый больничный, чтобы он учитывался в расчётах
        </p>
      )}

      {sortedSickLeaves.length > 0 && <hr />}

      {!addingNew ? (
        <Button onClick={() => setAddingNew(true)} className="w-full">
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <SickLeaveForm
            onStartDateChange={() => {}}
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      <hr />

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Больничный считается от среднего заработка за 2 предшествующих года (доход / 730).
          Первые 3 дня болезни оплачивает работодатель, далее – СФР. Стаж определяет процент:{" "}
          &lt;5 лет – 60%, 5–8 лет – 80%, 8+ лет – 100%.
        </p>
      </div>
    </div>
  );
}
