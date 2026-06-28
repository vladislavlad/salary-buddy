import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Plus, Info } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { VacationType, LocalDate } from "@/shared/types";
import { localToday } from "@/shared/types";
import { useVacationsProvider } from "@/features/vacation/hooks/useVacationsProvider";
import { useCalendar } from "@/features/calendar/hooks/useCalendar.ts";
import { VacationForm } from "./VacationForm";
import { VacationCard } from "./VacationCard";

export function VacationManager() {
  const { vacations, addVacation, updateVacation, removeVacation } =
    useVacationsProvider();
  const { calendars } = useCalendar();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newStartDate, setNewStartDate] = useState(localToday());

  const sortedVacations = [...vacations].sort((a, b) =>
    Temporal.PlainDate.compare(a.startDate, b.startDate),
  );

  // Берём календарь года начала отпуска – для inline-валидации в форме
  const newCalendarData = calendars.get(newStartDate.year) ?? null;

  const handleSave = async (data: {
    vacationId?: string;
    startDate: LocalDate;
    calendarDays: number;
    type: VacationType;
  }) => {
    if (data.vacationId) {
      await updateVacation({
        vacationId: data.vacationId,
        startDate: data.startDate,
        calendarDays: data.calendarDays,
        type: data.type,
      });
    } else {
      await addVacation({
        startDate: data.startDate,
        calendarDays: data.calendarDays,
        type: data.type,
      });
    }
    setEditingId(null);
    setAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    await removeVacation(id);
  };

  return (
    <div className="space-y-4">
      {sortedVacations.length > 0 && (
        <div className="space-y-1.5">
          {sortedVacations.map((v) => {
            const calData = calendars.get(v.startDate.year) ?? null;
            return (
              <VacationCard
                key={v.id}
                vacation={v}
                calendarData={calData}
                isEditing={editingId === v.id}
                onEdit={(vacId) => setEditingId(vacId)}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancelEdit={() => setEditingId(null)}
              />
            );
          })}
        </div>
      )}

      {sortedVacations.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Добавьте первый отпуск, чтобы он учитывался в расчётах
        </p>
      )}

      {sortedVacations.length > 0 && <hr />}

      {!addingNew ? (
        <Button onClick={() => setAddingNew(true)} className="w-full">
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <VacationForm
            calendarData={newCalendarData}
            onStartDateChange={setNewStartDate}
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      <hr />

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Для корректных расчётов отпускных заполните данные о доходе за
          предыдущий год. Отпускные считаются от среднего заработка за 12
          месяцев, предшествующих месяцу начала отпуска.
        </p>
      </div>
    </div>
  );
}
