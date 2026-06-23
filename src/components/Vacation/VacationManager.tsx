import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/moneyinput';
import type { VacationType } from '@/types';
import { useVacationsProvider } from '@/hooks/useVacationsProvider';
import { VacationForm } from './VacationForm';
import { VacationCard } from './VacationCard';

export function VacationManager() {
  const { vacations, addVacation, updateVacation, removeVacation, vacationSettings, updateVacationSettings } = useVacationsProvider();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Сортируем отпуска по дате начала
  const sortedVacations = [...vacations].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  const handleSave = (data: { id?: string; startDate: Date; endDate: Date; type: VacationType }) => {
    if (data.id) {
      updateVacation(data.id, { startDate: data.startDate, endDate: data.endDate, type: data.type });
    } else {
      addVacation({ startDate: data.startDate, endDate: data.endDate, type: data.type });
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
          {sortedVacations.map((v) => (
            <VacationCard
              key={v.id}
              vacation={v}
              isEditing={editingId === v.id}
              onEdit={(vac) => setEditingId(vac.id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
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
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      <hr />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Расширенные настройки отпускных</h3>
        <div className="space-y-2">
          <Label htmlFor="vacation-income">Доход за последние 12 месяцев (до НДФЛ)</Label>
          <MoneyInput
            id="vacation-income"
            value={vacationSettings.annualIncome12m ?? 0}
            onChange={(val) => updateVacationSettings({ annualIncome12m: val > 0 ? val : undefined })}
          />
          <p className="text-xs text-muted-foreground">
            Если не указано, считается из фактических окладов за год
          </p>
        </div>
      </div>
    </div>
  );
}
