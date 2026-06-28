import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { SickLeaveReason, SickLeaveExperience, LocalDate } from "@/shared/types";
import { localToDate } from "@/shared/types/local-date";
import { SickLeaveForm } from "./SickLeaveForm";

const REASON_LABELS: Record<SickLeaveReason, string> = {
  "illness": "Собственное заболевание",
  "work-injury": "Производственная травма",
  "child-care-under7": "Уход за ребёнком &lt; 7 лет",
  "child-care-7to15": "Уход за ребёнком 7–15 лет",
};

const EXPERIENCE_LABELS: Record<SickLeaveExperience, string> = {
  "under5": "&lt; 5 лет (60%)",
  "5to8": "5–8 лет (80%)",
  "8plus": "8+ лет (100%)",
};

function SickLeaveRowContent({
  sickLeave,
  onEdit,
  onDelete,
}: {
  sickLeave: {
    id: string;
    startDate: LocalDate;
    calendarDays: number;
    dates: LocalDate[];
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const lastDate = sickLeave.dates[sickLeave.dates.length - 1];

  return (
    <div className="flex items-center justify-between group">
      <div className="min-w-0">
        <p className="font-medium">
          {format(localToDate(sickLeave.startDate), "d MMMM", { locale: ru })} –{" "}
          {lastDate
            ? format(localToDate(lastDate), "d MMMM yyyy", { locale: ru })
            : ""}
        </p>
        <p className="text-muted-foreground text-sm">
          {sickLeave.calendarDays} кал. дн.,{" "}
          <span dangerouslySetInnerHTML={{ __html: REASON_LABELS[sickLeave.reason] }} />
        </p>
        <p className="text-muted-foreground text-xs">
          Стаж: <span dangerouslySetInnerHTML={{ __html: EXPERIENCE_LABELS[sickLeave.experience] }} />
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(sickLeave.id)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(sickLeave.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SickLeaveCard({
  sickLeave,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onCancelEdit,
}: {
  sickLeave: {
    id: string;
    startDate: LocalDate;
    calendarDays: number;
    dates: LocalDate[];
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  };
  isEditing: boolean;
  onEdit: (id: string) => void;
  onSave: (data: {
    sickLeaveId?: string;
    startDate: LocalDate;
    calendarDays: number;
    reason: SickLeaveReason;
    experience: SickLeaveExperience;
  }) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card-secondary p-3">
      {isEditing ? (
        <SickLeaveForm
          initial={sickLeave}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <SickLeaveRowContent
          sickLeave={sickLeave}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
