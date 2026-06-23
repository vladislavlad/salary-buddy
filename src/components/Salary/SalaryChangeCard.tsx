import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SalaryChange } from '@/types';
import { formatCurrency } from '@/lib/format';
import { SalaryChangeForm } from './SalaryChangeForm';

function SalaryChangeRowContent({
  change,
  onEdit,
  onDelete,
}: {
  change: SalaryChange;
  onEdit: (change: SalaryChange) => void;
  onDelete: (id: string) => void;
}) {
  const dateStr = format(change.effectiveDate, 'MMMM yyyy', { locale: ru });

  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">С {dateStr}</p>
        <p className="text-muted-foreground text-sm">{formatCurrency(change.amount)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(change)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(change.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SalaryChangeCard({
  change,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  change: SalaryChange;
  isEditing: boolean;
  onEdit: (change: SalaryChange) => void;
  onSave: (data: Omit<SalaryChange, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <SalaryChangeForm initial={change} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <SalaryChangeRowContent change={change} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}
