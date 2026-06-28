import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DatePicker } from "@/shared/ui/datepicker";
import { MoneyInput } from "@/shared/ui/moneyinput";
import { NumberField } from "@/shared/ui/numberfield";
import type { BonusType, LocalDate } from "@/shared/types";
import { localToday } from "@/shared/types";

export function BonusForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { id: string; date: LocalDate; amount: number; type: BonusType };
  onSave: (data: {
    id?: string;
    date: LocalDate;
    amount: number;
    type: BonusType;
  }) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState<LocalDate>(initial?.date ?? localToday());
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [type, setType] = useState<BonusType>(initial?.type ?? "salaries");

  const canSave = date !== null && amount > 0;
  const isEdit = !!initial;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {isEdit ? "Редактировать премию" : "Новая премия"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCancel}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-2">
          <Label>Дата</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={type} onValueChange={(v: BonusType) => setType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salaries">В окладах</SelectItem>
              <SelectItem value="custom">Своя сумма</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "salaries" ? (
          <NumberField
            label="Кол-во окладов"
            value={amount}
            min={0}
            onChange={setAmount}
          />
        ) : (
          <div className="space-y-2">
            <Label>Сумма (₽, до НДФЛ)</Label>
            <MoneyInput value={amount} onChange={setAmount} />
          </div>
        )}
      </div>
      <div className="pt-2">
        <Button
          size="sm"
          className="w-full"
          disabled={!canSave}
          onClick={() => {
            if (!date) return;
            onSave({ id: initial?.id, date, amount, type });
          }}
        >
          <Check className="w-3.5 h-3.5" />
          {isEdit ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </div>
  );
}
