import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { SurchargeChange } from "@/shared/types";
import { localToDate } from "@/shared/types/local-date";
import { Money } from "@/shared/ui/money";
import { SurchargeChangeForm } from "./SurchargeChangeForm";

function SurchargeChangeRowContent({
  change,
  onEdit,
  onDelete,
}: {
  change: SurchargeChange;
  onEdit: (change: SurchargeChange) => void;
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
          <Money amount={change.amount} />
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

export function SurchargeChangeCard({
  change,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  change: SurchargeChange;
  isEditing: boolean;
  onEdit: (change: SurchargeChange) => void;
  onSave: (data: Omit<SurchargeChange, "id"> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <SurchargeChangeForm
          initial={change}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <SurchargeChangeRowContent
          change={change}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
