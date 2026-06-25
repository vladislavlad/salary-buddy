import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { VacationType, LocalDate } from "@/shared/types";
import { localToDate } from "@/shared/types/local-date";
import { VacationForm } from "./VacationForm";
import type { CalendarData } from "@/shared/types";

function VacationRowContent({
  vacation,
  onEdit,
  onDelete,
}: {
  vacation: {
    id: string;
    startDate: LocalDate;
    calendarDays: number;
    dates: LocalDate[];
    type: VacationType;
  };
  onEdit: (vacationId: string) => void;
  onDelete: (id: string) => void;
}) {
  const lastDate = vacation.dates[vacation.dates.length - 1];

  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">
          {format(localToDate(vacation.startDate), "d MMMM", { locale: ru })} —{" "}
          {lastDate
            ? format(localToDate(lastDate), "d MMMM yyyy", { locale: ru })
            : ""}
        </p>
        <p className="text-muted-foreground text-sm">
          {vacation.calendarDays} кал. дн.
          {vacation.type === "paid" ? ", оплачиваемый" : ", за свой счёт"}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(vacation.id)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(vacation.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function VacationCard({
  vacation,
  isEditing,
  calendarData,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  vacation: {
    id: string;
    startDate: LocalDate;
    calendarDays: number;
    dates: LocalDate[];
    type: VacationType;
  };
  isEditing: boolean;
  calendarData: CalendarData | null;
  onEdit: (vacationId: string) => void;
  onSave: (data: {
    vacationId?: string;
    startDate: LocalDate;
    calendarDays: number;
    type: VacationType;
  }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <VacationForm
          initial={vacation}
          calendarData={calendarData}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <VacationRowContent
          vacation={vacation}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
