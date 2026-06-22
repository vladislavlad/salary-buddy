import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Bonus, BonusType } from '@/types';

function pluralizeSalaries(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'окладов';
  if (lastDigit === 1) return 'оклад';
  if (lastDigit >= 2 && lastDigit <= 4) return 'оклада';
  return 'окладов';
}

interface BonusManagerProps {
  bonuses: Bonus[];
  onAdd: (bonus: Omit<Bonus, 'id'>) => void;
  onRemove: (id: string) => void;
}

export function BonusManager({ bonuses, onAdd, onRemove }: BonusManagerProps) {
  const [date, setDate] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<BonusType>('salaries');

  const handleAdd = () => {
    if (!date || !value) return;
    onAdd({
      date: new Date(date),
      amount: Number(value),
      type,
    });
    setDate('');
    setValue('');
    setType('salaries');
  };

  return (
    <div className="space-y-4">
      {/* Список добавленных премий */}
      {bonuses.length > 0 && (
        <div className="space-y-2">
          {bonuses.map((bonus) => (
            <div
              key={bonus.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {format(bonus.date, 'd MMMM yyyy', { locale: ru })}
                </p>
                <p className="text-muted-foreground text-sm">
                  {bonus.type === 'salaries'
                    ? `${bonus.amount} ${pluralizeSalaries(bonus.amount)}`
                    : `${bonus.amount.toLocaleString('ru-RU')} ₽ (до НДФЛ)`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(bonus.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Разделитель */}
      {bonuses.length > 0 && <hr />}

      {/* Форма добавления */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="bonus-date">Дата</Label>
          <Input
            id="bonus-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonus-type">Тип</Label>
          <Select value={type} onValueChange={(v: BonusType) => setType(v)}>
            <SelectTrigger id="bonus-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salaries">В окладах</SelectItem>
              <SelectItem value="custom">Своя сумма</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonus-value">
            {type === 'salaries' ? 'Кол-во окладов' : 'Сумма (₽, до НДФЛ)'}
          </Label>
          <Input
            id="bonus-value"
            type="number"
            min={0}
            step={type === 'salaries' ? 1 : 1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <Button onClick={handleAdd} className="w-full" disabled={!date || !value}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>
    </div>
  );
}
