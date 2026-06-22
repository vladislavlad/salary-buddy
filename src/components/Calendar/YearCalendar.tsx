import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { format, getDaysInMonth, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { PaymentInfo, CalendarData, BonusPaymentInfo } from '@/types';
import { isDayOff } from '@/services/calendar';
import { formatCurrency } from '@/lib/format';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface YearCalendarProps {
  year: number;
  payments: PaymentInfo[];
  bonusPayments: BonusPaymentInfo[];
  calendarData: CalendarData | null;
}

export function YearCalendar({ year, payments, bonusPayments, calendarData }: YearCalendarProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Создаём мапу дат выплат для быстрого поиска
  const paymentMap = new Map<string, PaymentInfo>();
  for (const p of payments) {
    const key = format(p.date, 'yyyy-MM-dd');
    paymentMap.set(key, p);
  }

  // Мапа дат премий
  const bonusMap = new Map<string, BonusPaymentInfo>();
  for (const b of bonusPayments) {
    const key = format(b.date, 'yyyy-MM-dd');
    bonusMap.set(key, b);
  }

  // Объединённая мапа для popover'а
  const allItems = new Map<string, PaymentInfo | BonusPaymentInfo>();
  for (const [k, v] of paymentMap) allItems.set(k, v);
  for (const [k, v] of bonusMap) allItems.set(k, v);

  const getCellRef = useCallback((key: string): HTMLDivElement | null => {
    return cellRefs.current.get(key) ?? null;
  }, []);

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <MonthGrid
            key={monthName}
            year={year}
            month={monthIndex}
            monthName={monthName}
            paymentMap={paymentMap}
            bonusMap={bonusMap}
            calendarData={calendarData}
            cellRefs={cellRefs.current}
            onClickCell={(key) => setSelectedKey(key)}
          />
        ))}
      </div>

      {/* Всплывающее окно */}
      {selectedKey && allItems.has(selectedKey) && (
        <ItemPopover
          item={allItems.get(selectedKey)!}
          anchorRef={getCellRef(selectedKey)}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}

function ItemPopover({
  item,
  anchorRef,
  onClose,
}: {
  item: PaymentInfo | BonusPaymentInfo;
  anchorRef: HTMLDivElement | null;
  onClose: () => void;
}) {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    function updatePosition() {
      if (!anchorRef || !anchorRef.isConnected) return;
      const rect = anchorRef.getBoundingClientRect();
      const popoverWidth = 280;
      const popoverHeight = 240;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
      if (left < 8) left = 8;
      if (left + popoverWidth > viewportW - 8) left = viewportW - popoverWidth - 8;

      // Если не помещается снизу — показываем сверху
      let top = rect.bottom + 6;
      if (top + popoverHeight > viewportH - 8) {
        top = rect.top - popoverHeight - 6;
      }
      if (top < 8) top = 8;

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [anchorRef]);

  const isPayment = 'type' in item;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[280px] rounded-lg border bg-card shadow-lg p-3 space-y-2 text-sm"
        style={{ top: position.top, left: position.left }}
      >
        <p className="font-semibold">
          {format(item.date, 'd MMMM yyyy', { locale: ru })}
        </p>
        {isPayment ? (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тип:</span>
              <span>{item.type === 'advance' ? 'Аванс' : 'Зарплата'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Оклад:</span>
              <span className="font-medium">{formatCurrency(item.gross)}</span>
            </div>
            {item.taxBreakdown?.map((b) => (
              <div key={b.rate} className="flex justify-between">
                <span className="text-muted-foreground">НДФЛ ({b.rate}%):</span>
                <span className="text-red-500">-{formatCurrency(b.amount)}</span>
              </div>
            )) ?? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">НДФЛ:</span>
                <span className="text-red-500">-{formatCurrency(item.ndfl)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="font-semibold">На руки:</span>
              <span className="font-bold text-green-600">{formatCurrency(item.net)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тип:</span>
              <span>Премия</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">До НДФЛ:</span>
              <span className="font-medium">{formatCurrency(item.gross)}</span>
            </div>
            {item.taxBreakdown?.map((b) => (
              <div key={b.rate} className="flex justify-between">
                <span className="text-muted-foreground">НДФЛ ({b.rate}%):</span>
                <span className="text-red-500">-{formatCurrency(b.amount)}</span>
              </div>
            )) ?? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">НДФЛ:</span>
                <span className="text-red-500">-{formatCurrency(item.ndfl)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="font-semibold">На руки:</span>
              <span className="font-bold text-green-600">{formatCurrency(item.net)}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  monthName: string;
  paymentMap: Map<string, PaymentInfo>;
  bonusMap: Map<string, BonusPaymentInfo>;
  calendarData: CalendarData | null;
  cellRefs: Map<string, HTMLDivElement>;
  onClickCell: (key: string) => void;
}

function MonthGrid({ year, month, monthName, paymentMap, bonusMap, calendarData, cellRefs, onClickCell }: MonthGridProps) {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const firstDay = new Date(year, month, 1);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const today = new Date();

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Количество дней от начала недели первого числа до конца месяца
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

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-center text-sm">{monthName}</h3>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="text-[10px] text-muted-foreground text-center py-0.5">
            {name}
          </div>
        ))}

        {weeks.flat().map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const dateKey = format(day, 'yyyy-MM-dd');
          const payment = paymentMap.get(dateKey);
          const bonus = bonusMap.get(dateKey);
          const hasItem = !!(payment || bonus);
          const isToday =
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();

          let cellClass = 'text-center py-1 text-xs rounded-md';

          if (!isCurrentMonth) {
            cellClass += ' text-muted-foreground/30';
          } else if (payment) {
            cellClass += ' bg-green-100 text-green-800 font-bold cursor-pointer hover:bg-green-200 transition-colors';
          } else if (bonus) {
            cellClass += ' bg-blue-100 text-blue-800 font-bold cursor-pointer hover:bg-blue-200 transition-colors';
          } else if (isToday) {
            cellClass += ' bg-yellow-100 text-yellow-800 font-bold';
          } else if (calendarData && isDayOff(day, calendarData)) {
            cellClass += ' text-red-500';
          }

          let tooltip = '';
          if (payment) {
            tooltip = payment.type === 'advance' ? `Аванс ${formatCurrency(payment.net)}` : `Зарплата ${formatCurrency(payment.net)}`;
          } else if (bonus) {
            tooltip = `Премия ${formatCurrency(bonus.net)}`;
          } else if (isToday) {
            tooltip = 'Сегодня';
          }

          return (
            <div
              key={idx}
              className={cellClass + (tooltip ? ' relative group' : '')}
              ref={(el) => {
                if (!hasItem || !el) {
                  cellRefs.delete(dateKey);
                  return;
                }
                cellRefs.set(dateKey, el);
              }}
              onClick={() => hasItem && onClickCell(dateKey)}
            >
              {day.getDate()}
              {tooltip && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs rounded bg-popover text-popover-foreground border shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60]">
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
