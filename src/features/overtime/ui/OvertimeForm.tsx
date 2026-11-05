import { useId, useState, type FormEvent } from "react";
import { useCalendar } from "@/features/calendar/hooks/useCalendar";
import { isDayOff } from "@/features/calendar/model/calendar";
import { today } from "@/shared/types/local-date";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/datepicker";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  OVERTIME_MULTIPLIERS,
  OvertimeInputSchema,
  type Overtime,
  type OvertimeInput,
} from "../model/overtime";

export function OvertimeForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: Overtime;
  saving: boolean;
  onSave: (input: OvertimeInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial?.date ?? today);
  const [hours, setHours] = useState(String(initial?.hours ?? 8));
  const [chosenMultiplier, setChosenMultiplier] = useState(initial?.multiplier);
  const { calendars } = useCalendar();
  const calendar = calendars.get(date.year);
  const dayOff = calendar ? isDayOff(date, calendar) : undefined;
  const multiplier = chosenMultiplier ?? (dayOff ? 2 : 1);
  const hoursId = useId();
  const rateId = useId();
  const dateLabel = useId();
  const values = OvertimeInputSchema.safeParse({
    date,
    hours: Number(hours),
    multiplier,
  });
  const dateError = values.success
    ? undefined
    : values.error.issues.find((issue) => issue.path[0] === "date")?.message;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.success && !saving) void onSave(values.data);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-1.5" role="group" aria-labelledby={dateLabel}>
        <Label id={dateLabel}>Дата работы</Label>
        <DatePicker value={date} onChange={setDate} />
        {dateError ? (
          <p className="text-xs text-destructive">{dateError}</p>
        ) : dayOff !== undefined ? (
          <p className="text-xs text-muted-foreground">
            {dayOff ? "Выходной или праздник" : "Рабочий день"}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={hoursId}>Часы</Label>
          <Input
            id={hoursId}
            type="number"
            step="any"
            min={0}
            max={24}
            required
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={rateId}>Ставка</Label>
          <Select
            value={String(multiplier)}
            onValueChange={(value) =>
              setChosenMultiplier(
                OVERTIME_MULTIPLIERS.find((rate) => String(rate) === value),
              )
            }
          >
            <SelectTrigger id={rateId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OVERTIME_MULTIPLIERS.map((rate) => (
                <SelectItem key={rate} value={String(rate)}>
                  ×{rate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={saving}
          onClick={onCancel}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={saving || !values.success}
        >
          {initial ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}
