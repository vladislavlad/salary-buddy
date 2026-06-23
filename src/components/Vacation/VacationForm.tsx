import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/datepicker';
import type { VacationType } from '@/types';

export function VacationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { id: string; startDate: Date; endDate: Date; type: VacationType };
  onSave: (data: { id?: string; startDate: Date; endDate: Date; type: VacationType }) => void;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState(initial?.startDate ?? new Date());
  const [endDate, setEndDate] = useState(initial?.endDate ?? new Date());
  const [type, setType] = useState<VacationType>(initial?.type ?? 'paid');

  const canSave = startDate !== null && endDate !== null && endDate >= startDate;
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
        </div>
        <div className="space-y-2">
          <Label>Дата окончания</Label>
          <DatePicker value={endDate} onChange={setEndDate} />
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
          if (!startDate || !endDate) return;
          onSave({ id: initial?.id, startDate, endDate, type });
        }}>
          <Check className="w-3.5 h-3.5 mr-1" />
          {isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </div>
  );
}
