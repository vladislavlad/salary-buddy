import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { SurchargeChange, SurchargeUpdateRequest } from "@/shared/types";
import { toast } from "@/shared/ui/use-toast";
import { useSurchargeProvider } from "@/features/surcharge/hooks/useSurchargeProvider";
import { SurchargeChangeForm } from "./SurchargeChangeForm";
import { SurchargeChangeCard } from "./SurchargeChangeCard";

export function SurchargeManager() {
  const { surcharges, addSurcharge, updateSurcharge, removeSurcharge } =
    useSurchargeProvider();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Сортируем доплаты по дате
  const sortedSurcharges = [...surcharges].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );

  const handleSaveSurcharge = async (
    data: Omit<SurchargeChange, "id"> & { id?: string },
  ) => {
    const result = data.id
      ? await updateSurcharge({
          surchargeId: data.id,
          effectiveDate: data.effectiveDate,
          amount: data.amount,
        } satisfies SurchargeUpdateRequest)
      : await addSurcharge({
          effectiveDate: data.effectiveDate,
          amount: data.amount,
        });

    if (!result.ok) {
      toast({ variant: "destructive", description: result.error });
      return;
    }

    setEditingId(null);
    setAddingNew(false);
  };

  const handleDeleteSurcharge = (id: string) => {
    removeSurcharge(id);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {sortedSurcharges.map((surcharge) => (
          <SurchargeChangeCard
            key={surcharge.id}
            change={surcharge}
            isEditing={editingId === surcharge.id}
            onEdit={(c) => setEditingId(c.id)}
            onSave={handleSaveSurcharge}
            onDelete={handleDeleteSurcharge}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
      </div>

      {sortedSurcharges.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Нет доплат. Добавленная сумма не облагается НДФЛ и прибавляется к
          выплате после расчёта налога
        </p>
      )}

      {sortedSurcharges.length > 0 && <hr />}

      {!addingNew ? (
        <Button onClick={() => setAddingNew(true)} className="w-full">
          <Plus className="w-4 h-4" />
          Добавить доплату
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <SurchargeChangeForm
            onSave={handleSaveSurcharge}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}
    </div>
  );
}
