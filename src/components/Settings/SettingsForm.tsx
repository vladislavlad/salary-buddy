import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoneyInput } from '@/components/ui/moneyinput';
import type { SalarySettings, PaymentDistribution } from '@/types';

interface SettingsFormProps {
  settings: SalarySettings;
  onChange: (updates: Partial<SalarySettings>) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  // Синхронизируем с внешним значением при изменении извне
  if (localValue !== String(value) && document.activeElement?.id !== `input-${label.replace(/\s/g, '-')}`) {
    setLocalValue(String(value));
  }

  const id = `input-${label.replace(/\s/g, '-')}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          const num = Number(localValue);
          if (!isNaN(num)) {
            if (min !== undefined && num < min) return;
            if (max !== undefined && num > max) return;
            onChange(num);
          } else {
            setLocalValue(String(value));
          }
        }}
      />
    </div>
  );
}

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="input-salary">Оклад до НДФЛ (₽)</Label>
        <MoneyInput
          id="input-salary"
          value={settings.salary}
          min={0}
          onChange={(val) => onChange({ salary: val })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Число аванса"
          value={settings.advanceDay}
          min={1}
          max={28}
          onChange={(val) => onChange({ advanceDay: val })}
        />

        <NumberField
          label="Число зарплаты"
          value={settings.salaryDay}
          min={1}
          max={28}
          onChange={(val) => onChange({ salaryDay: val })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="distribution">Распределение оплаты</Label>
        <Select
          value={settings.distribution}
          onValueChange={(value: PaymentDistribution) => onChange({ distribution: value })}
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
    </div>
  );
}
