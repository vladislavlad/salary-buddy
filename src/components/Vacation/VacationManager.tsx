import { useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/datepicker';
import { MoneyInput } from '@/components/ui/moneyinput';
import type { Vacation, VacationType, VacationSettings } from '@/types';

interface VacationManagerProps {
  vacations: Vacation[];
  onAdd: (vacation: Omit<Vacation, 'id'>) => void;
  onRemove: (id: string) => void;
  vacationSettings: VacationSettings;
  onUpdateVacationSettings: (partial: Partial<VacationSettings>) => void;
}

export function VacationManager({ vacations, onAdd, onRemove, vacationSettings, onUpdateVacationSettings }: VacationManagerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<VacationType>('paid');

  const handleAdd = () => {
    if (!startDate || !endDate) return;
    onAdd({
      startDate,
      endDate,
      type,
    });
    setStartDate(null);
    setEndDate(null);
    setType('paid');
  };

  const canAdd = !!(startDate && endDate && endDate >= startDate);

  return (
    <div className="space-y-4">
      {/* Список отпусков */}
      {vacations.length > 0 && (
        <div className="space-y-2">
          {vacations.map((v) => {
            const days = differenceInCalendarDays(v.endDate, v.startDate) + 1;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card-secondary"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {format(v.startDate, 'd MMMM', { locale: ru })} — {format(v.endDate, 'd MMMM yyyy', { locale: ru })}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {days} кал. дн.{v.type === 'paid' ? ', оплачиваемый' : ', за свой счёт'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onRemove(v.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Разделитель */}
      {vacations.length > 0 && <hr />}

      {/* Форма добавления */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="vacation-start">Дата начала</Label>
          <DatePicker value={startDate} onChange={setStartDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacation-end">Дата окончания</Label>
          <DatePicker value={endDate} onChange={setEndDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vacation-type">Тип отпуска</Label>
          <Select value={type} onValueChange={(v: VacationType) => setType(v)}>
            <SelectTrigger id="vacation-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Оплачиваемый</SelectItem>
              <SelectItem value="unpaid">За свой счёт</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAdd} className="w-full" disabled={!canAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Разделитель */}
      <hr />

      {/* Расширенные настройки отпускных */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Расширенные настройки отпускных</h3>
        <div className="space-y-2">
          <Label htmlFor="vacation-income">Доход за последние 12 месяцев (до НДФЛ)</Label>
          <MoneyInput
            id="vacation-income"
            value={vacationSettings.annualIncome12m ?? 0}
            onChange={(val) => onUpdateVacationSettings({ annualIncome12m: val > 0 ? val : undefined })}
          />
          <p className="text-xs text-muted-foreground">
            Если не указано, считается как оклад × 12
          </p>
        </div>
      </div>
    </div>
  );
}
