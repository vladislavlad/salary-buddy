import { useState } from 'react';
import { format, getDaysInMonth, startOfWeek, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { PaymentInfo, CalendarData } from '@/types';
import { isDayOff } from '@/services/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface YearCalendarProps {
  year: number;
  payments: PaymentInfo[];
  calendarData: CalendarData | null;
}

export function YearCalendar({ year, payments, calendarData }: YearCalendarProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentInfo | null>(null);

  // Создаём мапу дат выплат для быстрого поиска
  const paymentMap = new Map<string, PaymentInfo>();
  for (const p of payments) {
    const key = format(p.date, 'yyyy-MM-dd');
    paymentMap.set(key, p);
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MONTH_NAMES.map((monthName, monthIndex) => (
          <MonthGrid
            key={monthName}
            year={year}
            month={monthIndex}
            monthName={monthName}
            paymentMap={paymentMap}
            calendarData={calendarData}
            onSelectPayment={setSelectedPayment}
          />
        ))}
      </div>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        {selectedPayment && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {format(selectedPayment.date, 'd MMMM yyyy', { locale: ru })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Тип:</span>
                <span className="font-medium">
                  {selectedPayment.type === 'advance' ? 'Аванс' : 'Зарплата'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Оклад:</span>
                <span className="font-medium">{formatCurrency(selectedPayment.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">НДФЛ:</span>
                <span className="font-medium text-red-500">-{formatCurrency(selectedPayment.ndfl)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground font-semibold">На руки:</span>
                <span className="font-bold text-green-600">{formatCurrency(selectedPayment.net)}</span>
              </div>
              {selectedPayment.date.getTime() !== selectedPayment.originalDate.getTime() && (
                <p className="text-xs text-muted-foreground pt-2">
                  Дата смещена с {format(selectedPayment.originalDate, 'd MMMM')} на ближайший рабочий день
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

interface MonthGridProps {
  year: number;
  month: number;
  monthName: string;
  paymentMap: Map<string, PaymentInfo>;
  calendarData: CalendarData | null;
  onSelectPayment: (payment: PaymentInfo) => void;
}

function MonthGrid({ year, month, monthName, paymentMap, calendarData, onSelectPayment }: MonthGridProps) {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const firstDay = new Date(year, month, 1);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const today = new Date();

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (let i = 0; i < addDays(startDate, daysInMonth + ((firstDay.getDay() + 6) % 7)).getDate() - startDate.getDate() + 1; i++) {
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
    <div className="space-y-2">
      <h3 className="font-semibold text-center">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="text-xs text-muted-foreground text-center py-1">
            {name}
          </div>
        ))}

        {weeks.flat().map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const dateKey = format(day, 'yyyy-MM-dd');
          const payment = paymentMap.get(dateKey);
          const isToday =
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();

          let cellClass = 'text-center py-1.5 text-sm rounded-md';

          if (!isCurrentMonth) {
            cellClass += ' text-muted-foreground/30';
          } else if (payment) {
            cellClass += ' bg-green-100 text-green-800 font-bold cursor-pointer hover:bg-green-200 transition-colors';
          } else if (isToday) {
            cellClass += ' bg-blue-100 text-blue-800 font-bold';
          } else if (calendarData && isDayOff(day, calendarData)) {
            cellClass += ' text-red-500';
          }

          return (
            <div
              key={idx}
              className={cellClass}
              onClick={() => payment && onSelectPayment(payment)}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
