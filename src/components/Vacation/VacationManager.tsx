import { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VacationType } from '@/types';
import { useVacationsProvider } from '@/hooks/useVacationsProvider';
import { usePaymentsStore } from '@/hooks/usePaymentsHooks';
import { VacationForm } from './VacationForm';
import { VacationCard } from './VacationCard';

export function VacationManager() {
  const { vacations, addVacation, updateVacation, removeVacation } = useVacationsProvider();
  const { calendars } = usePaymentsStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const sortedVacations = [...vacations].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  // Для новой формы берём календарь текущего года
  const newCalendarData = calendars.get(new Date().getFullYear()) ?? null;

  const handleSave = (data: { id?: string; startDate: Date; calendarDays: number; dates: Date[]; type: VacationType }) => {
    if (data.id) {
      updateVacation(data.id, { startDate: data.startDate, calendarDays: data.calendarDays, dates: data.dates, type: data.type });
    } else {
      addVacation({ startDate: data.startDate, calendarDays: data.calendarDays, dates: data.dates, type: data.type });
    }
    setEditingId(null);
    setAddingNew(false);
  };

  const handleDelete = (id: string) => {
    removeVacation(id);
  };

  return (
    <div className="space-y-4">
      {sortedVacations.length > 0 && (
        <div className="space-y-1.5">
          {sortedVacations.map((v) => {
            const calData = calendars.get(v.startDate.getFullYear()) ?? null;
            return (
              <VacationCard
                key={v.id}
                vacation={v}
                calendarData={calData}
                isEditing={editingId === v.id}
                onEdit={(vac) => setEditingId(vac.id)}
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
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <VacationForm
            calendarData={newCalendarData}
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      <hr />

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Для корректных расчётов отпускных заполните данные о доходе за предыдущий год.
          Отпускные считаются от среднего заработка за 12 месяцев, предшествующих месяцу начала отпуска.
        </p>
      </div>
    </div>
  );
}