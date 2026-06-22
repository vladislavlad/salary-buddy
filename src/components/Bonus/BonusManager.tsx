import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Bonus, BonusType } from '@/types';

interface BonusManagerProps {
  bonuses: Bonus[];
  onAdd: (bonus: Omit<Bonus, 'id'>) => void;
  onRemove: (id: string) => void;
}

export function BonusManager({ bonuses, onAdd, onRemove }: BonusManagerProps) {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<BonusType>('gross');

  const handleAdd = () => {
    if (!date || !amount) return;
    onAdd({
      date: new Date(date),
      amount: Number(amount),
      type,
    });
    setDate('');
    setAmount('');
    setType('gross');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <Label htmlFor="bonus-amount">Сумма (₽)</Label>
          <Input
            id="bonus-amount"
            type="number"
            min={0}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bonus-type">Тип</Label>
          <Select value={type} onValueChange={(v: BonusType) => setType(v)}>
            <SelectTrigger id="bonus-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gross">В окладах (до НДФЛ)</SelectItem>
              <SelectItem value="net">Своя сумма (на руки)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button onClick={handleAdd} className="w-full" disabled={!date || !amount}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {bonuses.length > 0 && (
        <div className="space-y-2">
          {bonuses.map((bonus) => (
            <div
              key={bonus.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <span className="font-medium">
                  {format(bonus.date, 'd MMMM yyyy', { locale: ru })}
                </span>
                <span className="text-muted-foreground ml-2">
                  — {bonus.amount.toLocaleString('ru-RU')} ₽ ({bonus.type === 'gross' ? 'до НДФЛ' : 'на руки'})
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(bonus.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
