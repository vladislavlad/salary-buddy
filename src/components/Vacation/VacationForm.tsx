import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/datepicker';
import type { VacationType } from '@/types';
import type { CalendarData } from '@/types';
import { isOfficialHoliday, computeVacationDates } from '@/services/calendar';

export function VacationForm({
  initial,
  calendarData,
  onSave,
  onCancel,
}: {
  initial?: { id: string; startDate: Date; calendarDays: number; dates: Date[]; type: VacationType };
  calendarData: CalendarData | null;
  onSave: (data: { id?: string; startDate: Date; calendarDays: number; dates: Date[]; type: VacationType }) => void;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date());
  const [daysInput, setDaysInput] = useState<string>(String(initial?.calendarDays ?? 14));
  const [type, setType] = useState<VacationType>(initial?.type ?? 'paid');

  // Валидация на blur: пустое → 1, не число → 1.
  const handleDaysBlur = () => {
    const parsed = parseInt(daysInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setDaysInput('1');
    } else {
      setDaysInput(String(Math.min(60, parsed)));
    }
  };

  const calendarDays = Math.max(1, parseInt(daysInput, 10) || 1);
  const daysError = !isNaN(parseInt(daysInput, 10)) ? false : daysInput.length > 0;
  const isStartHoliday = calendarData && isOfficialHoliday(startDate, calendarData);

  const canSave = !isStartHoliday && !daysError;
  const isEdit = !!initial;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{isEdit ? 'Редактировать отпуск' : 'Новый отпуск'}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-2">
          <Label>Дата начала</Label>
          <DatePicker value={startDate} onChange={setStartDate} />
          {isStartHoliday && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Нельзя начать отпуск с праздничного дня
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Количество календарных дней</Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            onBlur={handleDaysBlur}
          />
          {daysError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Введите число от 1 до 60
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Тип отпуска</Label>
          <Select value={type} onValueChange={(v: VacationType) => setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Оплачиваемый</SelectItem>
              <SelectItem value="unpaid">За свой счёт</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pt-2">
        <Button size="sm" className="w-full" disabled={!canSave} onClick={() => {
          if (!calendarData) return;
          const dates = computeVacationDates(startDate, calendarDays, calendarData);
          onSave({ id: initial?.id, startDate, calendarDays, dates, type });
        }}>
          <Check className="w-3.5 h-3.5 mr-1" />
          {isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </div>
  );
}