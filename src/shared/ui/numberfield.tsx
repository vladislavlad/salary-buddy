import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Label } from "@/shared/ui/label";

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  if (
    localValue !== String(value) &&
    document.activeElement?.id !== `input-${label.replace(/\s/g, "-")}`
  ) {
    setLocalValue(String(value));
  }

  const id = `input-${label.replace(/\s/g, "-")}`;

  const increment = () => {
    const num = Number(localValue);
    if (!isNaN(num)) {
      const next = num + 1;
      if (max === undefined || next <= max) {
        setLocalValue(String(next));
        onChange(next);
      }
    }
  };

  const decrement = () => {
    const num = Number(localValue);
    if (!isNaN(num)) {
      const prev = num - 1;
      if (min === undefined || prev >= min) {
        setLocalValue(String(prev));
        onChange(prev);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-8 overflow-hidden rounded-md border border-input shadow-sm">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
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
          className="flex h-full w-full rounded-md border-none bg-transparent px-3 py-1 text-sm shadow-none focus-visible:outline-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <div className="flex flex-col border-l">
          <button
            type="button"
            onClick={increment}
            disabled={max !== undefined && Number(localValue) >= max}
            className="flex-1 min-h-0 flex items-center justify-center w-7 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <div className="w-full h-px bg-input shrink-0" />
          <button
            type="button"
            onClick={decrement}
            disabled={min !== undefined && Number(localValue) <= min}
            className="flex-1 min-h-0 flex items-center justify-center w-7 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
