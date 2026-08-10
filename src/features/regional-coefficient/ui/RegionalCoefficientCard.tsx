import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { RegionalCoefficientChange } from "@/shared/types";
import { localToDate } from "@/shared/types/local-date";
import { RegionalCoefficientForm } from "./RegionalCoefficientForm";

function RegionalCoefficientRowContent({
  change,
  onEdit,
  onDelete,
}: {
  change: RegionalCoefficientChange;
  onEdit: (change: RegionalCoefficientChange) => void;
  onDelete: (id: string) => void;
}) {
  const dateStr = format(localToDate(change.effectiveDate), "d MMMM yyyy", {
    locale: ru,
  });

  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">С {dateStr}</p>
        <p className="text-muted-foreground text-sm">
          {change.percent}%
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(change)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(change.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function RegionalCoefficientCard({
  change,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  change: RegionalCoefficientChange;
  isEditing: boolean;
  onEdit: (change: RegionalCoefficientChange) => void;
  onSave: (data: Omit<RegionalCoefficientChange, "id"> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <RegionalCoefficientForm
          initial={change}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <RegionalCoefficientRowContent
          change={change}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
