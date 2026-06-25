import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Plus } from "lucide-react";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { NumberField } from "@/shared/ui/numberfield";
import type {
  Salary,
  SalaryPaymentSettings,
  PaymentDistribution,
  SalaryChange,
} from "@/shared/types";
import { SalaryChangeForm } from "./SalaryChangeForm";
import { SalaryChangeCard } from "./SalaryChangeCard";

interface SalaryManagerProps {
  salaries: Salary[];
  paymentSettings: SalaryPaymentSettings;
  onSalariesChange: (salaries: Salary[]) => void;
  onPaymentSettingsChange: (updates: Partial<SalaryPaymentSettings>) => void;
}

export function SalaryManager({
  salaries,
  paymentSettings,
  onSalariesChange,
  onPaymentSettingsChange,
}: SalaryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Сортируем оклады по дате
  const sortedChanges = [...salaries].sort((a, b) =>
    Temporal.PlainDate.compare(a.effectiveDate, b.effectiveDate),
  );

  const handleAddChange = (
    data: Omit<SalaryChange, "id"> & { id?: string },
  ) => {
    const newChange: SalaryChange = {
      effectiveDate: data.effectiveDate,
      amount: data.amount,
      id: data.id ?? crypto.randomUUID(),
    };
    const updated = data.id
      ? salaries.map((c) => (c.id === data.id ? newChange : c))
      : [...salaries, newChange];
    onSalariesChange(updated);
    setEditingId(null);
    setAddingNew(false);
  };

  const handleDeleteChange = (id: string) => {
    onSalariesChange(salaries.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Числа выплат */}
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Число аванса"
          value={paymentSettings.advancePaymentDay}
          min={1}
          max={28}
          onChange={(val) =>
            onPaymentSettingsChange({ advancePaymentDay: val })
          }
        />
        <NumberField
          label="Число зарплаты"
          value={paymentSettings.salaryPaymentDay}
          min={1}
          max={28}
          onChange={(val) => onPaymentSettingsChange({ salaryPaymentDay: val })}
        />
      </div>

      {/* Распределение */}
      <div className="space-y-2">
        <Label htmlFor="distribution">Распределение оплаты</Label>
        <Select
          value={paymentSettings.distribution}
          onValueChange={(value: PaymentDistribution) =>
            onPaymentSettingsChange({ distribution: value })
          }
        >
          <SelectTrigger id="distribution">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fifty-fifty">50/50</SelectItem>
            <SelectItem value="by-worked-days">По отработанным дням</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Разделитель */}
      <div className="border-t" />

      {/* Список окладов */}
      <div className="space-y-3">
        {sortedChanges.length > 0 && (
          <Label className="text-sm font-medium">Оклады</Label>
        )}

        <div className="space-y-1.5">
          {sortedChanges.map((change) => (
            <SalaryChangeCard
              key={change.id}
              change={change}
              isEditing={editingId === change.id}
              onEdit={(c) => setEditingId(c.id)}
              onSave={handleAddChange}
              onDelete={handleDeleteChange}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>

        {sortedChanges.length === 0 && !addingNew && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Добавьте первый оклад, чтобы начать расчёт
          </p>
        )}

        {sortedChanges.length > 0 && <hr />}

        {!addingNew ? (
          <Button onClick={() => setAddingNew(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        ) : (
          <div className="rounded-lg border bg-card-secondary p-3">
            <SalaryChangeForm
              onSave={handleAddChange}
              onCancel={() => setAddingNew(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
