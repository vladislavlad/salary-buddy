import type {
  Payment,
  CalendarData,
  LocalDate,
} from "@/shared/types";
import { WEEKDAY_NAMES, dateToKey } from "@/shared/lib/utils";
import { DayCell } from "./DayCell";
import { localDate, today as localToday } from "@/shared/types/local-date";

interface MonthGridProps {
  year: number;
  month: number;
  monthName: string;
  combinedMap: Map<string, Payment[]>;
  vacationDays: Map<string, boolean>;
  sickLeaveDays: Map<string, boolean>;
  calendarData: CalendarData | null;
  cellRefs: Map<string, HTMLDivElement>;
  onClickCell: (key: string) => void;
}

export function MonthGrid({
  year,
  month,
  monthName,
  combinedMap,
  vacationDays,
  sickLeaveDays,
  calendarData,
  cellRefs,
  onClickCell,
}: MonthGridProps) {
  const firstOfMonth = localDate(year, month + 1, 1);
  const daysInMonth = firstOfMonth.daysInMonth;
  const today = localToday();

  // ISO day of week: 1=Mon … 7=Sun → padding for Mon-start grid
  const padding = firstOfMonth.dayOfWeek - 1;

  // Всегда 6 недель (42 ячейки): высота и выравнивание месяцев не должны
  // зависеть от того, на сколько недель попадает конкретный месяц/год.
  // Недостающие ячейки добиваются днями соседних месяцев (рендерятся серыми).
  const WEEKS_IN_GRID = 6;
  const gridStart = firstOfMonth.subtract({ days: padding });
  const weeks: LocalDate[][] = [];
  for (let w = 0; w < WEEKS_IN_GRID; w++) {
    const week: LocalDate[] = [];
    for (let dow = 0; dow < 7; dow++) {
      week.push(gridStart.add({ days: w * 7 + dow }));
    }
    weeks.push(week);
  }

  // Хвостовая неделя без единого дня текущего месяца скрывается (visibility:hidden):
  // ячейки остаются и держат высоту сетки, но дни-«перетекания» не отображаются.
  const weekHasRealDay = weeks.map((week) =>
    week.some((d) => d.month === month + 1),
  );

  const vacationDateSet = new Set<string>();
  const sickDateSet = new Set<string>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateToKey(localDate(year, month + 1, d));
    if (vacationDays.has(key)) {
      vacationDateSet.add(key);
    }
    if (sickLeaveDays.has(key)) {
      sickDateSet.add(key);
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      <h3
        className="font-semibold text-center shrink-0"
        style={{ fontSize: "var(--cal-month)" }}
      >
        {monthName}
      </h3>
      <div
        className="grid grid-cols-7 gap-0.5 flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${1 + weeks.length}, 1fr)` }}
      >
        {WEEKDAY_NAMES.map((name) => (
          <div
            key={name}
            className="flex items-center justify-center text-muted-foreground py-0.5"
            style={{ fontSize: "var(--cal-weekday)" }}
          >
            {name}
          </div>
        ))}

        {weeks.flat().map((day, idx) => {
          const isCurrentMonth = day.month === month + 1;
          const hiddenRow = !weekHasRealDay[Math.floor(idx / 7)];
          const dateKey = dateToKey(day);
          const dayPayments = isCurrentMonth
            ? combinedMap.get(dateKey)
            : undefined;
          const hasItem = !!(dayPayments && dayPayments.length > 0);
          const paymentCount = dayPayments?.length ?? 0;
          const allConfirmed =
            hasItem && dayPayments!.every((p) => p.fact != null);
          const isTodayFlag = today.equals(day);
          const isVacationDay = vacationDateSet.has(dateKey);

          let vacFirstInSeries = false;
          let vacLastInSeries = false;
          if (isVacationDay) {
            const d = day.day;
            const prevKey = dateToKey(day.subtract({ days: 1 }));
            const nextKey = dateToKey(day.add({ days: 1 }));
            vacFirstInSeries = !vacationDateSet.has(prevKey);
            vacLastInSeries =
              d === daysInMonth || !vacationDateSet.has(nextKey);
          }

          // Отпуск имеет приоритет над больничным при пересечении дат.
          const isSickDay = !isVacationDay && sickDateSet.has(dateKey);
          let sickFirstInSeries = false;
          let sickLastInSeries = false;
          if (isSickDay) {
            const d = day.day;
            const prevKey = dateToKey(day.subtract({ days: 1 }));
            const nextKey = dateToKey(day.add({ days: 1 }));
            sickFirstInSeries = !sickDateSet.has(prevKey);
            sickLastInSeries = d === daysInMonth || !sickDateSet.has(nextKey);
          }

          return (
            <DayCell
              key={idx}
              day={day}
              isCurrentMonth={isCurrentMonth}
              hiddenRow={hiddenRow}
              dayPayments={dayPayments}
              paymentCount={paymentCount}
              allConfirmed={allConfirmed}
              isTodayFlag={isTodayFlag}
              isVacationDay={isVacationDay}
              vacFirstInSeries={vacFirstInSeries}
              vacLastInSeries={vacLastInSeries}
              isSickDay={isSickDay}
              sickFirstInSeries={sickFirstInSeries}
              sickLastInSeries={sickLastInSeries}
              calendarData={calendarData}
              dateKey={dateKey}
              cellRefs={cellRefs}
              onClickCell={onClickCell}
            />
          );
        })}
      </div>
    </div>
  );
}
