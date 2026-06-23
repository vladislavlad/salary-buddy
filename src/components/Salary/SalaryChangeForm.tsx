import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/datepicker';
import { MoneyInput } from '@/components/ui/moneyinput';
import type { SalaryChange } from '@/types';

export function SalaryChangeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SalaryChange;
  onSave: (data: Omit<SalaryChange, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial?.effectiveDate ?? new Date());
  const [amount, setAmount] = useState(initial?.amount ?? 0);

  const canSave = date !== null && amount > 0;
  const isEdit = !!initial;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{isEdit ? 'Редактировать оклад' : 'Новый оклад'}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-2">
          <Label>Дата</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-2">
          <Label>Оклад (₽)</Label>
          <MoneyInput value={amount} onChange={setAmount} />
        </div>
      </div>
      <div className="pt-2">
        <Button size="sm" className="w-full" disabled={!canSave} onClick={() => {
          if (!date) return;
          onSave({ id: initial?.id, effectiveDate: date, amount });
        }}>
          <Check className="w-3.5 h-3.5 mr-1" />
          {isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </div>
  );
}
