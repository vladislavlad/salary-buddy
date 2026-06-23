import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BonusType } from '@/types';
import { Money } from '@/components/ui/money';
import { BonusForm } from './BonusForm';

function pluralizeSalaries(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return 'окладов';
  if (lastDigit === 1) return 'оклад';
  if (lastDigit >= 2 && lastDigit <= 4) return 'оклада';
  return 'окладов';
}

function BonusRowContent({
  bonus,
  onEdit,
  onDelete,
}: {
  bonus: { id: string; date: Date; amount: number; type: BonusType };
  onEdit: (bonus: { id: string; date: Date; amount: number; type: BonusType }) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">
          {format(bonus.date, 'd MMMM yyyy', { locale: ru })}
        </p>
        <p className="text-muted-foreground text-sm">
          {bonus.type === 'salaries'
            ? `${bonus.amount} ${pluralizeSalaries(bonus.amount)}`
            : <><Money amount={bonus.amount} /> (до НДФЛ)</>}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(bonus)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(bonus.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function BonusCard({
  bonus,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  bonus: { id: string; date: Date; amount: number; type: BonusType };
  isEditing: boolean;
  onEdit: (bonus: { id: string; date: Date; amount: number; type: BonusType }) => void;
  onSave: (data: { id?: string; date: Date; amount: number; type: BonusType }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <BonusForm initial={bonus} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <BonusRowContent bonus={bonus} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}
