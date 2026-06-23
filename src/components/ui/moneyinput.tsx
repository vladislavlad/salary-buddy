import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatMoneyInput } from '@/lib/format';

interface MoneyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
}

export function MoneyInput({ id, value, onChange }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState('');
  const isFocused = useRef(false);

  // При потере фокуса — форматируем значение
  useEffect(() => {
    if (!isFocused.current && value > 0) {
      setDisplayValue(formatMoneyInput(value));
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
          setDisplayValue(formatMoneyInput(value));
        } else {
          setDisplayValue('');
        }
      }}
    />
  );
}
