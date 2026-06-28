import { useEffect, useRef, useState } from "react";
import { Input } from "@/shared/ui/input";
import { formatMoneyInput, parseRubles } from "@/shared/lib/money";

interface MoneyInputProps {
  id?: string;
  value: number; // копейки
  onChange: (value: number) => void; // копейки
}

export function MoneyInput({ id, value, onChange }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState("");
  const isFocused = useRef(false);

  // При потере фокуса – форматируем значение (копейки → строка с пробелами в рублях)
  useEffect(() => {
    if (!isFocused.current && value > 0) {
      setDisplayValue(formatMoneyInput(Math.round(value / 100)));
    } else if (!isFocused.current && value === 0) {
      setDisplayValue("");
    }
  }, [value]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      placeholder="0"
      value={displayValue}
      onChange={(e) => {
        setDisplayValue(e.target.value);
        const raw = e.target.value.replace(/\s/g, "");
        if (raw === "") {
          onChange(0);
        } else if (/^\d+$/.test(raw)) {
          // Пользователь вводит рубли → конвертируем в копейки
          onChange(parseRubles(raw));
        }
      }}
      onFocus={() => {
        isFocused.current = true;
        // Показываем значение в рублях для редактирования
        setDisplayValue(value > 0 ? String(Math.round(value / 100)) : "");
      }}
      onBlur={() => {
        isFocused.current = false;
        if (value > 0) {
          setDisplayValue(formatMoneyInput(Math.round(value / 100)));
        } else {
          setDisplayValue("");
        }
      }}
    />
  );
}
