import { useLayoutEffect, useRef } from "react";
import { Money } from "@/shared/ui/money";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface FactEditorInlineProps {
  editValue: string;
  setEditValue: (v: string) => void;
  editPreviewGrossKop: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FactEditorInline({
  editValue,
  setEditValue,
  editPreviewGrossKop,
  onConfirm,
  onCancel,
}: FactEditorInlineProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <div className="mt-2 space-y-1.5">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Сумма на руки"
      />
      {editPreviewGrossKop != null && (
        <p className="text-xs text-muted-foreground">
          До НДФЛ: <Money amount={editPreviewGrossKop} />
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Отмена
        </Button>
        <Button size="sm" onClick={onConfirm} className="flex-1">
          Подтвердить
        </Button>
      </div>
    </div>
  );
}
