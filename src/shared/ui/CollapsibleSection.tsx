import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Сворачиваемая секция-карточка с заголовком и иконкой.
 * Управляет собственным состоянием раскрытия (по умолчанию закрыта).
 */
export function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        className="w-full flex items-center justify-between p-6 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h2 className="font-semibold leading-none tracking-tight">{title}</h2>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {open && <CardContent className="px-6 pb-4">{children}</CardContent>}
    </Card>
  );
}
