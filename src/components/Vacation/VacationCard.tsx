import { format, differenceInCalendarDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VacationType } from '@/types';
import { VacationForm } from './VacationForm';

function VacationRowContent({
  vacation,
  onEdit,
  onDelete,
}: {
  vacation: { id: string; startDate: Date; endDate: Date; type: VacationType };
  onEdit: (vacation: { id: string; startDate: Date; endDate: Date; type: VacationType }) => void;
  onDelete: (id: string) => void;
}) {
  const days = differenceInCalendarDays(vacation.endDate, vacation.startDate) + 1;

  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">
          {format(vacation.startDate, 'd MMMM', { locale: ru })} — {format(vacation.endDate, 'd MMMM yyyy', { locale: ru })}
        </p>
        <p className="text-muted-foreground text-sm">
          {days} кал. дн.{vacation.type === 'paid' ? ', оплачиваемый' : ', за свой счёт'}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(vacation)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(vacation.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function VacationCard({
  vacation,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  vacation: { id: string; startDate: Date; endDate: Date; type: VacationType };
  isEditing: boolean;
  onEdit: (vacation: { id: string; startDate: Date; endDate: Date; type: VacationType }) => void;
  onSave: (data: { id?: string; startDate: Date; endDate: Date; type: VacationType }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <VacationForm initial={vacation} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <VacationRowContent vacation={vacation} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}
