import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { RegionalCoefficientChange, RegionalCoefficientUpdateRequest } from "@/shared/types";
import { toast } from "@/shared/ui/use-toast";
import { useRegionalCoefficientProvider } from "@/features/regional-coefficient/hooks/useRegionalCoefficientProvider";
import { RegionalCoefficientForm } from "./RegionalCoefficientForm";
import { RegionalCoefficientCard } from "./RegionalCoefficientCard";

export function RegionalCoefficientManager() {
  const { coefficients, addCoefficient, updateCoefficient, removeCoefficient } =
    useRegionalCoefficientProvider();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Сортируем коэффициенты по дате
  const sortedCoefficients = [...coefficients].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );

  const handleSaveCoefficient = async (
    data: Omit<RegionalCoefficientChange, "id"> & { id?: string },
  ) => {
    const result = data.id
      ? await updateCoefficient({
          coefficientId: data.id,
          effectiveDate: data.effectiveDate,
          percent: data.percent,
        } satisfies RegionalCoefficientUpdateRequest)
      : await addCoefficient({
          effectiveDate: data.effectiveDate,
          percent: data.percent,
        });

    if (!result.ok) {
      toast({ variant: "destructive", description: result.error });
      return;
    }

    setEditingId(null);
    setAddingNew(false);
  };

  const handleDeleteCoefficient = (id: string) => {
    removeCoefficient(id);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {sortedCoefficients.map((coefficient) => (
          <RegionalCoefficientCard
            key={coefficient.id}
            change={coefficient}
            isEditing={editingId === coefficient.id}
            onEdit={(c) => setEditingId(c.id)}
            onSave={handleSaveCoefficient}
            onDelete={handleDeleteCoefficient}
            onCancelEdit={() => setEditingId(null)}
          />
        ))}
      </div>

      {sortedCoefficients.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Нет районного коэффициента. Коэффициент увеличивает оклад и облагается НДФЛ
        </p>
      )}

      {sortedCoefficients.length > 0 && <hr />}

      {!addingNew ? (
        <Button onClick={() => setAddingNew(true)} className="w-full">
          <Plus className="w-4 h-4" />
          Добавить коэффициент
        </Button>
      ) : (
        <div className="rounded-lg border bg-card-secondary p-3">
          <RegionalCoefficientForm
            onSave={handleSaveCoefficient}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}
    </div>
  );
}
