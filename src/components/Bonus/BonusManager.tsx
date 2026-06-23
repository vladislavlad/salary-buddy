import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BonusType } from '@/types';
import { useBonusesProvider } from '@/hooks/useBonusesProvider';
import { BonusForm } from './BonusForm';
import { BonusCard } from './BonusCard';

export function BonusManager() {
  const { bonuses, addBonus, updateBonus, removeBonus } = useBonusesProvider();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Сортируем премии по дате
  const sortedBonuses = [...bonuses].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const handleSave = (data: { id?: string; date: Date; amount: number; type: BonusType }) => {
    if (data.id) {
      updateBonus(data.id, { date: data.date, amount: data.amount, type: data.type });
    } else {
      addBonus({ date: data.date, amount: data.amount, type: data.type });
    }
    setEditingId(null);
    setAddingNew(false);
  };

  const handleDelete = (id: string) => {
    removeBonus(id);
  };

  return (
    <div className="space-y-4">
      {sortedBonuses.length > 0 && (
        <div className="space-y-1.5">
          {sortedBonuses.map((bonus) => (
            <BonusCard
              key={bonus.id}
              bonus={bonus}
              isEditing={editingId === bonus.id}
              onEdit={(b) => setEditingId(b.id)}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}

      {sortedBonuses.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Добавьте первую премию, чтобы она учитывалась в расчётах
        </p>
      )}

      {sortedBonuses.length > 0 && <hr />}

      {!addingNew ? (
        <Button onClick={() => setAddingNew(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <BonusForm
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}
    </div>
  );
}
