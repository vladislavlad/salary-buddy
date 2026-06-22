import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SalarySettings, PaymentDistribution } from '@/types';

interface SettingsFormProps {
  settings: SalarySettings;
  onChange: (updates: Partial<SalarySettings>) => void;
}

export function SettingsForm({ settings, onChange }: SettingsFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="salary">Оклад до НДФЛ (₽)</Label>
        <Input
          id="salary"
          type="number"
          min={0}
          step={1000}
          value={settings.salary}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (!isNaN(val) && val >= 0) {
              onChange({ salary: val });
            }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="advanceDay">Число аванса</Label>
          <Input
            id="advanceDay"
            type="number"
            min={1}
            max={28}
            value={settings.advanceDay}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 28) {
                onChange({ advanceDay: val });
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salaryDay">Число зарплаты</Label>
          <Input
            id="salaryDay"
            type="number"
            min={1}
            max={28}
            value={settings.salaryDay}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 28) {
                onChange({ salaryDay: val });
              }
            }}
          />
        </div>
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
