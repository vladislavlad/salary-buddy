import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Форматирует число с пробелами между разрядами: "123 456 789".
 */
export function formatMoney(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

interface MoneyInputProps {
  id?: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}

export function MoneyInput({ id, value, min: _min, onChange }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState('');
  const isFocused = useRef(false);

  // При потере фокуса — форматируем значение
  useEffect(() => {
    if (!isFocused.current && value > 0) {
      setDisplayValue(formatMoney(value));
    } else if (!isFocused.current && value === 0) {
      setDisplayValue('');
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
        const raw = e.target.value.replace(/\s/g, '');
        if (raw === '') {
          onChange(0);
        } else if (/^\d+$/.test(raw)) {
          onChange(Number(raw));
        }
      }}
      onFocus={() => {
        isFocused.current = true;
        setDisplayValue(value > 0 ? String(value) : '');
      }}
      onBlur={() => {
        isFocused.current = false;
        if (value > 0) {
          setDisplayValue(formatMoney(value));
        } else {
          setDisplayValue('');
        }
      }}
    />
  );
}
