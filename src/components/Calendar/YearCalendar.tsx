import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { format, getDaysInMonth, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Payment, CalendarData, TaxBracketBreakdown } from '@/types';
import { isDayOff } from '@/services/calendar';
import { formatCurrency } from '@/lib/format';
import { cn, WEEKDAY_NAMES, dateToKey } from '@/lib/utils';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

type DayPayment = Payment;

const PAYMENT_PRIORITY: Record<string, number> = {
  advance: 1,
  salary: 1,
  vacation: 2,
  bonus: 3,
};

function getHighestPriority(payments: DayPayment[]): string {
  let highest = '';
  let maxP = 0;
  for (const p of payments) {
    const pr = PAYMENT_PRIORITY[p.type] ?? 0;
    if (pr > maxP) {
      maxP = pr;
      highest = p.type;
    }
  }
  return highest;
}

function getPaymentLabel(type: string): string {
  switch (type) {
    case 'advance': return 'Аванс';
    case 'salary': return 'Зарплата';
    case 'vacation': return 'Отпускные';
    case 'bonus': return 'Премия';
    default: return type;
  }
}

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = 8;
const POPOVER_GAP_BELOW = 6;
const POPOVER_GAP_ABOVE = 2;

const PAYMENT_COLOR_VAR: Record<string, string> = {
  advance: 'var(--pay-salary-bg)',
  salary: 'var(--pay-salary-bg)',
  vacation: 'var(--pay-vacation-bg)',
  bonus: 'var(--pay-bonus-bg)',
};

function getStripeStyle(types: string[]): React.CSSProperties | undefined {
  if (types.length < 2) return undefined;
  const unique = [...new Set(types)];
  const step = 10 / unique.length;
  const stops = unique.map((t, i) => {
    const c = PAYMENT_COLOR_VAR[t] ?? 'var(--pay-salary-bg)';
    const start = (i * step).toFixed(2);
    const end = ((i + 1) * step).toFixed(2);
    return `${c} ${start}px, ${c} ${end}px`;
  });
  return {
    '--stripe-gradient': `repeating-linear-gradient(-45deg, ${stops.join(', ')})`,
  } as React.CSSProperties;
}

interface PaymentDetailsProps {
  label?: string;
  grossLabel: string;
  salaryAmount?: number;
  isBonus?: boolean;
  gross: number;
  ndfls: TaxBracketBreakdown[];
  ndfl: number;
  yearToDateGross?: number;
}

function PaymentDetails({ label, grossLabel, salaryAmount, isBonus, gross, ndfls, ndfl, yearToDateGross }: PaymentDetailsProps) {
  return (
    <>
      {label && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Тип:</span>
          <span>{label}</span>
        </div>
      )}
      {salaryAmount != null && salaryAmount > 0 && !isBonus && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Оклад:</span>
          <span>{formatCurrency(salaryAmount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">{grossLabel}:</span>
        <span className="font-medium">{formatCurrency(gross)}</span>
      </div>
      {ndfls.length > 0 ? (
        ndfls.map((b) => (
          <div key={b.rate} className="flex justify-between">
            <span className="text-muted-foreground">НДФЛ ({b.rate}%):</span>
            <span className="text-red-500">-{formatCurrency(b.amount)}</span>
          </div>
        ))
      ) : (
        <div className="flex justify-between">
          <span className="text-muted-foreground">НДФЛ:</span>
          <span className="text-red-500">-{formatCurrency(ndfl)}</span>
        </div>
      )}
      {yearToDateGross != null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Доход с начала года:</span>
          <span>{formatCurrency(yearToDateGross)}</span>
        </div>
      )}
    </>
  );
}

interface YearCalendarProps {
  year: number;
  payments: Payment[];
  vacationDays: Map<string, boolean>;
  calendarData: CalendarData | null;
}

export function YearCalendar({ year, payments, vacationDays, calendarData }: YearCalendarProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Группируем все выплаты по датам
  const combinedMap = new Map<string, DayPayment[]>();
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

  const selectedPayments = selectedKey ? combinedMap.get(selectedKey) ?? null : null;

  return (
    <div
      className="relative min-h-full"
      style={{
        '--cal-text': 'clamp(0.75rem, calc(0.62rem + 0.3vw), 1rem)',
        '--cal-month': 'clamp(0.8rem, calc(0.68rem + 0.25vw), 1.05rem)',
        '--cal-weekday': 'clamp(0.6rem, calc(0.54rem + 0.15vw), 0.75rem)',
      } as React.CSSProperties}
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
            calendarData={calendarData}
            cellRefs={cellRefs.current}
            onClickCell={(key) => setSelectedKey(key)}
          />
        ))}
      </div>

      {selectedKey && selectedPayments && (
        <ItemPopover
          payments={selectedPayments}
          anchorRef={getCellRef(selectedKey)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}

function ItemPopover({
  payments,
  anchorRef,
  onClose,
}: {
  payments: DayPayment[];
  anchorRef: HTMLDivElement | null;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    function updatePosition() {
      if (!anchorRef || !anchorRef.isConnected) return;
      const rect = anchorRef.getBoundingClientRect();
      const popoverEl = popoverRef.current;
      const popoverHeight = popoverEl ? popoverEl.offsetHeight : (payments.length > 1 ? 420 : 240);
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = rect.left + (rect.width / 2) - (POPOVER_WIDTH / 2);
      if (left < POPOVER_MARGIN) left = POPOVER_MARGIN;
      if (left + POPOVER_WIDTH > viewportW - POPOVER_MARGIN) left = viewportW - POPOVER_WIDTH - POPOVER_MARGIN;

      // Сначала пытаемся показать снизу
      let top = rect.bottom + POPOVER_GAP_BELOW;
      const fitsBelow = top + popoverHeight <= viewportH - POPOVER_MARGIN;

      if (!fitsBelow) {
        // Пытаемся сверху
        const aboveTop = rect.top - popoverHeight - POPOVER_GAP_ABOVE;
        const fitsAbove = aboveTop >= POPOVER_MARGIN;

        if (fitsAbove) {
          top = aboveTop;
        } else {
          // Не влазит ниоткуда — выбираем сторону с большим свободным местом
          const spaceBelow = viewportH - rect.bottom - POPOVER_MARGIN;
          const spaceAbove = rect.top - POPOVER_MARGIN;
          if (spaceBelow >= spaceAbove) {
            top = Math.max(POPOVER_MARGIN, viewportH - popoverHeight - POPOVER_MARGIN);
          } else {
            top = POPOVER_MARGIN;
          }
        }
      }

      setPosition({ top, left });
    }

    // Первый проход — с оценочной высотой, второй — после рендера с реальной
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, payments.length]);

  const sortedPayments = [...payments].sort((a, b) => (PAYMENT_PRIORITY[b.type] ?? 0) - (PAYMENT_PRIORITY[a.type] ?? 0));

  const firstPayment = sortedPayments[0];
  const maxYearToDateGross = Math.max(...sortedPayments.map(p => p.yearToDateGross));
  const totalNet = sortedPayments.reduce((sum, p) => sum + p.net, 0);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={popoverRef}
        className="fixed z-50 w-[280px] rounded-lg border bg-card-secondary popover-shadow p-3 space-y-2 text-sm"
        style={{ top: position.top, left: position.left }}
      >
        <p className="font-semibold">
          {firstPayment ? format(firstPayment.date, 'd MMMM yyyy', { locale: ru }) : ''}
        </p>
        {sortedPayments.map((item, idx) => (
          <div key={idx}>
            {idx > 0 && <div className="border-t my-2" />}
            <PaymentDetails
              label={getPaymentLabel(item.type)}
              grossLabel="До НДФЛ"
              salaryAmount={item.salaryAmount}
              isBonus={item.type === 'bonus'}
              gross={item.gross}
              ndfls={item.ndfls}
              ndfl={item.ndfl}
            />
          </div>
        ))}
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Доход с начала года:</span>
            <span>{formatCurrency(maxYearToDateGross)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="font-semibold">Итого на руки:</span>
            <span className="font-bold text-green-600">{formatCurrency(totalNet)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  monthName: string;
  combinedMap: Map<string, DayPayment[]>;
  vacationDays: Map<string, boolean>;
  calendarData: CalendarData | null;
  cellRefs: Map<string, HTMLDivElement>;
  onClickCell: (key: string) => void;
}

function MonthGrid({ year, month, monthName, combinedMap, vacationDays, calendarData, cellRefs, onClickCell }: MonthGridProps) {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const firstDay = new Date(year, month, 1);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const today = new Date();

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  const daysFromStartOfWeek = (firstDay.getDay() + 6) % 7;
  const totalDays = daysFromStartOfWeek + daysInMonth;

  for (let i = 0; i < totalDays; i++) {
    const day = addDays(startDate, i);
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const vacationDateSet = new Set<string>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateToKey(new Date(year, month, d));
    if (vacationDays.has(key)) {
      vacationDateSet.add(key);
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      <h3 className="font-semibold text-center shrink-0" style={{ fontSize: 'var(--cal-month)' }}>{monthName}</h3>
      <div
        className="grid grid-cols-7 gap-0.5 flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${1 + weeks.length}, 1fr)` }}
      >
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="flex items-center justify-center text-muted-foreground py-0.5" style={{ fontSize: 'var(--cal-weekday)' }}>
            {name}
          </div>
        ))}

        {weeks.flat().map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const dateKey = dateToKey(day);
          const dayPayments = combinedMap.get(dateKey);
          const hasItem = !!(dayPayments && dayPayments.length > 0);
          const paymentCount = dayPayments?.length ?? 0;
          const isTodayFlag = isSameDay(day, today);
          const isVacationDay = vacationDateSet.has(dateKey);

          let vacFirstInSeries = false;
          let vacLastInSeries = false;
          if (isVacationDay) {
            const d = day.getDate();
            const prevKey = dateToKey(new Date(year, month, d - 1));
            const nextKey = dateToKey(new Date(year, month, d + 1));
            vacFirstInSeries = !vacationDateSet.has(prevKey);
            vacLastInSeries = d === daysInMonth || !vacationDateSet.has(nextKey);
          }

          const stripeStyle = hasItem && paymentCount > 1 ? getStripeStyle(dayPayments!.map(p => p.type)) : undefined;
          const highestType = hasItem ? getHighestPriority(dayPayments!) : null;

          // Inline style для цветов ячеек — берёт CSS-переменные из темы
          const payVarSuffix = highestType === 'bonus' ? 'bonus' : highestType === 'vacation' ? 'vacation' : 'salary';

          const cellPayStyle: React.CSSProperties | undefined = isCurrentMonth && hasItem
            ? {
                ...(stripeStyle ? {} : { backgroundColor: `var(--pay-${payVarSuffix}-bg)` }),
                color: `var(--pay-${payVarSuffix}-text)`,
              }
            : undefined;

          const cellVacStyle: React.CSSProperties | undefined = isCurrentMonth && !hasItem && isVacationDay
            ? {
                backgroundColor: 'var(--vac-day-bg)',
              }
            : undefined;

          const cellClass = cn(
            'flex items-center justify-center text-center py-1 rounded-md',
            !isCurrentMonth && 'text-muted-foreground/30',
            isCurrentMonth && hasItem && (stripeStyle ? 'font-bold cursor-pointer transition-colors' : 'font-bold cursor-pointer hover:transition-colors'),
            isCurrentMonth && !hasItem && isTodayFlag && 'cursor-default',
            isCurrentMonth && !isTodayFlag && isVacationDay && (
              cn({
                'text-red-500 dark:text-red-400/70': calendarData && isDayOff(day, calendarData),
                'rounded-md': vacFirstInSeries && vacLastInSeries,
                'rounded-l-md rounded-r-none': vacFirstInSeries && !vacLastInSeries,
                'rounded-r-md rounded-l-none': !vacFirstInSeries && vacLastInSeries,
                'rounded-none': !vacFirstInSeries && !vacLastInSeries,
              })
            ),
            isCurrentMonth && !hasItem && !isVacationDay && calendarData && isDayOff(day, calendarData) && 'text-red-500 dark:text-red-400/70',
          );

          const tooltip = hasItem
            ? formatCurrency(dayPayments!.reduce((sum, p) => sum + p.net, 0))
            : isVacationDay ? 'Отпуск' : '';

          return (
            <div
              key={idx}
              role={hasItem ? 'button' : undefined}
              tabIndex={hasItem ? 0 : undefined}
              className={cn('relative', cellClass, tooltip && 'group', stripeStyle && 'calendar-stripe-cell')}
              style={{ fontSize: 'var(--cal-text)', ...cellVacStyle, ...cellPayStyle, ...(stripeStyle ?? {}) }}
              ref={(el) => {
                if (!hasItem || !el) {
                  cellRefs.delete(dateKey);
                  return;
                }
                cellRefs.set(dateKey, el);
              }}
              onClick={() => hasItem && onClickCell(dateKey)}
              onKeyDown={(e) => {
                if (hasItem && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onClickCell(dateKey);
                }
              }}
            >
              {isTodayFlag ? (
                <span className="underline decoration-2">{day.getDate()}</span>
              ) : (
                day.getDate()
              )}

              {tooltip && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-card-secondary text-card-foreground border popover-shadow whitespace-pre-line opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60]">
                  {tooltip}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
