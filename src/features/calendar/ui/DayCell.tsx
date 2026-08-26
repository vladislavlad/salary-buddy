import { Check } from "lucide-react";
import type { CalendarData, LocalDate, Payment } from "@/shared/types";
import { isDayOff } from "@/features/calendar/model/calendar";
import { formatMoney } from "@/shared/lib/money";
import {
  PAY_VAR_SUFFIX,
  getHighestPriority,
  getStripeStyle,
} from "./calendar-payment-utils";
import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/ui/tooltip";

interface DayCellProps {
  day: LocalDate;
  isCurrentMonth: boolean;
  hiddenRow: boolean;
  dayPayments: Payment[] | undefined;
  paymentCount: number;
  allConfirmed: boolean;
  isTodayFlag: boolean;
  isVacationDay: boolean;
  vacFirstInSeries: boolean;
  vacLastInSeries: boolean;
  isSickDay: boolean;
  sickFirstInSeries: boolean;
  sickLastInSeries: boolean;
  calendarData: CalendarData | null;
  dateKey: string;
  cellRefs: Map<string, HTMLDivElement>;
  onClickCell: (key: string) => void;
}

export function DayCell({
  day,
  isCurrentMonth,
  hiddenRow,
  dayPayments,
  paymentCount,
  allConfirmed,
  isTodayFlag,
  isVacationDay,
  vacFirstInSeries,
  vacLastInSeries,
  isSickDay,
  sickFirstInSeries,
  sickLastInSeries,
  calendarData,
  dateKey,
  cellRefs,
  onClickCell,
}: DayCellProps) {
  const hasItem = !!(dayPayments && dayPayments.length > 0);

  const stripeStyle =
    hasItem && paymentCount > 1
      ? getStripeStyle(dayPayments!.map((p) => p.type))
      : undefined;
  const highestType = hasItem ? getHighestPriority(dayPayments!) : null;

  // Inline style для цветов ячеек – берёт CSS-переменные из темы
  const payVarSuffix = highestType ? PAY_VAR_SUFFIX[highestType] : "salary";

  const cellPayStyle: React.CSSProperties | undefined =
    isCurrentMonth && hasItem
      ? {
          ...(stripeStyle
            ? {}
            : { backgroundColor: `var(--pay-${payVarSuffix}-bg)` }),
          color: `var(--pay-${payVarSuffix}-text)`,
        }
      : undefined;

  const cellVacStyle: React.CSSProperties | undefined =
    isCurrentMonth && !hasItem && isVacationDay
      ? {
          backgroundColor: "var(--vac-day-bg)",
        }
      : undefined;

  const cellSickStyle: React.CSSProperties | undefined =
    isCurrentMonth && !hasItem && isSickDay
      ? {
          backgroundColor: "var(--sick-day-bg)",
        }
      : undefined;

  const cellClass = cn(
    "flex items-center justify-center text-center py-1 rounded-md",
    !isCurrentMonth && "text-muted-foreground/30",
    isCurrentMonth &&
      hasItem &&
      (stripeStyle
        ? "font-bold cursor-pointer transition-colors"
        : "font-bold cursor-pointer hover:transition-colors"),
    isCurrentMonth && !hasItem && isTodayFlag && "cursor-default",
    isCurrentMonth &&
      !isTodayFlag &&
      isVacationDay &&
      cn({
        "text-red-500 dark:text-red-400/70":
          calendarData && isDayOff(day, calendarData),
        "rounded-md": vacFirstInSeries && vacLastInSeries,
        "rounded-l-md rounded-r-none":
          vacFirstInSeries && !vacLastInSeries,
        "rounded-r-md rounded-l-none":
          !vacFirstInSeries && vacLastInSeries,
        "rounded-none": !vacFirstInSeries && !vacLastInSeries,
      }),
    isCurrentMonth &&
      !isTodayFlag &&
      isSickDay &&
      cn({
        "text-red-500 dark:text-red-400/70":
          calendarData && isDayOff(day, calendarData),
        "rounded-md": sickFirstInSeries && sickLastInSeries,
        "rounded-l-md rounded-r-none":
          sickFirstInSeries && !sickLastInSeries,
        "rounded-r-md rounded-l-none":
          !sickFirstInSeries && sickLastInSeries,
        "rounded-none": !sickFirstInSeries && !sickLastInSeries,
      }),
    isCurrentMonth &&
      !hasItem &&
      !isVacationDay &&
      !isSickDay &&
      calendarData &&
      isDayOff(day, calendarData) &&
      "text-red-500 dark:text-red-400/70",
  );

  const tooltip = hasItem
    ? formatMoney(dayPayments!.reduce((sum, p) => sum + p.net, 0))
    : isVacationDay
      ? "Отпуск"
      : isSickDay
        ? "Больничный"
        : "";

  const cellContent = (
    <div
      role={hasItem ? "button" : undefined}
      tabIndex={hasItem ? 0 : undefined}
      className={cn(
        "relative",
        cellClass,
        stripeStyle && "calendar-stripe-cell",
        hiddenRow && "invisible",
      )}
      style={{
        fontSize: "var(--cal-text)",
        ...cellVacStyle,
        ...cellSickStyle,
        ...cellPayStyle,
        ...(stripeStyle ?? {}),
      }}
      ref={(el) => {
        // Ref для якоря поповера принадлежит только ячейке своего
        // месяца. «Перетекающие» дни соседних месяцев (та же дата в
        // другой сетке) не должны трогать cellRefs – иначе они стирают
        // ref настоящей ячейки (баг с платежами на краю месяца).
        if (!isCurrentMonth) return;
        if (!hasItem || !el) {
          cellRefs.delete(dateKey);
          return;
        }
        cellRefs.set(dateKey, el as HTMLDivElement);
      }}
      onClick={() => hasItem && onClickCell(dateKey)}
      onKeyDown={(e) => {
        if (hasItem && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClickCell(dateKey);
        }
      }}
    >
      {isTodayFlag ? (
        <span className="underline decoration-2">{day.day}</span>
      ) : (
        day.day
      )}
      {allConfirmed && isCurrentMonth && (
        <Check
          strokeWidth={3}
          className="absolute top-0.5 right-0.5 h-3 w-3 text-green-600 dark:text-green-400"
        />
      )}
    </div>
  );

  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
      <TooltipContent
        sideOffset={4}
        className="text-sm font-bold bg-card-secondary text-card-foreground border popover-shadow px-2 py-0.5 whitespace-pre-line"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    cellContent
  );
}
