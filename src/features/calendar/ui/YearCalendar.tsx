import {
  useCallback,
  useRef,
  useState,
} from "react";
import type { Payment, CalendarData } from "@/shared/types";
import { dateToKey } from "@/shared/lib/utils";
import { MONTH_NAMES } from "./calendar-payment-utils";
import { MonthGrid } from "./MonthGrid";
import { PaymentDetailsPanel } from "./PaymentDetailsPanel";


interface YearCalendarProps {
  year: number;
  payments: Payment[];
  vacationDays: Map<string, boolean>;
  sickLeaveDays: Map<string, boolean>;
  calendarData: CalendarData | null;
}

export function YearCalendar({
  year,
  payments,
  vacationDays,
  sickLeaveDays,
  calendarData,
}: YearCalendarProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Группируем все выплаты по датам
  const combinedMap = new Map<string, Payment[]>();
  for (const item of payments) {
    const key = dateToKey(item.date);
    const existing = combinedMap.get(key);
    if (existing) {
      existing.push(item);
    } else {
      combinedMap.set(key, [item]);
    }
  }

  const getCellRef = useCallback((key: string): HTMLDivElement | null => {
    return cellRefs.current.get(key) ?? null;
  }, []);

  const selectedPayments = selectedKey
    ? (combinedMap.get(selectedKey) ?? null)
    : null;

  return (
    <div
      className="relative min-h-full"
      style={
        {
          "--cal-text": "clamp(0.75rem, calc(0.62rem + 0.3vw), 1rem)",
          "--cal-month": "clamp(0.8rem, calc(0.68rem + 0.25vw), 1.05rem)",
          "--cal-weekday": "clamp(0.6rem, calc(0.54rem + 0.15vw), 0.75rem)",
        } as React.CSSProperties
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-3 gap-x-4 lg:gap-x-8 min-h-full">
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <MonthGrid
            key={monthName}
            year={year}
            month={monthIndex}
            monthName={monthName}
            combinedMap={combinedMap}
            vacationDays={vacationDays}
            sickLeaveDays={sickLeaveDays}
            calendarData={calendarData}
            cellRefs={cellRefs.current}
            onClickCell={(key) => setSelectedKey(key)}
          />
        ))}
      </div>

      {selectedKey && selectedPayments && (
        <PaymentDetailsPanel
          payments={selectedPayments}
          anchorRef={getCellRef(selectedKey)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}


