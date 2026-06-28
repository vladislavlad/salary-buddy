import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LocalDate } from "@/shared/types/local-date";
import {
  localDate,
  localToDate,
  today as localToday,
} from "@/shared/types/local-date";
import { cn, WEEKDAY_NAMES } from "@/shared/lib/utils";

interface DatePickerProps {
  value: LocalDate | null;
  onChange: (date: LocalDate) => void;
  placeholder?: string;
  className?: string;
}

const POPUP_HEIGHT = 280;
const POPUP_WIDTH = 310;

export function DatePicker({
  value,
  onChange,
  placeholder = "Выберите дату",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<LocalDate>(value ?? localToday());
  const [viewMode, setViewMode] = useState<"day" | "year">("day");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Позиционирование попвера с учётом границ экрана
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = triggerRect.bottom + 8;
    let left = triggerRect.left;

    // Если не влезает снизу – показываем над кнопкой
    if (top + POPUP_HEIGHT > viewportH) {
      top = triggerRect.top - POPUP_HEIGHT - 4;
    }

    // Если не влезает справа – сдвигаем влево
    if (left + POPUP_WIDTH > viewportW) {
      left = viewportW - POPUP_WIDTH - 16;
    }

    // Не уходим за левый край
    if (left < 8) {
      left = 8;
    }

    setPopupStyle({
      position: "fixed",
      top,
      left,
      zIndex: 50,
    });
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setViewDate(value);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback(
    (day: LocalDate) => {
      onChange(day);
      setIsOpen(false);
    },
    [onChange],
  );

  // Навигация зависит от режима
  const prevPage = useCallback(() => {
    if (viewMode === "year") setViewDate(viewDate.subtract({ years: 1 }));
    else setViewDate(viewDate.subtract({ months: 1 }));
  }, [viewMode, viewDate]);
  const nextPage = useCallback(() => {
    if (viewMode === "year") setViewDate(viewDate.add({ years: 1 }));
    else setViewDate(viewDate.add({ months: 1 }));
  }, [viewMode, viewDate]);

  // Переключение в режим года по клику на заголовок
  const switchToYear = () => setViewMode("year");
  const selectMonth = (month: number) => {
    setViewDate(viewDate.with({ month }));
    setViewMode("day");
  };

  const currentYear = viewDate.year;

  // Кэшируем сегодняшнюю дату вне цикла
  const today = localToday();

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-input bg-card-secondary px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:border-ring",
          !value && "text-muted-foreground",
          className,
        )}
        onClick={() => {
          if (!isOpen) setViewMode("day");
          setIsOpen(!isOpen);
        }}
      >
        <span>
          {value
            ? format(localToDate(value), "d MMMM yyyy", { locale: ru })
            : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-2 shrink-0 opacity-50"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          style={{
            ...popupStyle,
            width: POPUP_WIDTH,
            ...(viewMode === "year" ? { height: 240 } : {}),
          }}
          className="rounded-lg border bg-card-secondary text-card-foreground popover-shadow p-3 animate-in fade-in zoom-in-95 flex flex-col"
        >
          {/* Навигация */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <button
              type="button"
              onClick={prevPage}
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Назад"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {viewMode === "day" ? (
              <span
                className="text-sm font-medium cursor-pointer hover:underline"
                onClick={switchToYear}
              >
                {format(localToDate(viewDate), "MMMM yyyy", { locale: ru })}
              </span>
            ) : (
              <span className="text-sm font-medium">{currentYear}</span>
            )}
            <button
              type="button"
              onClick={nextPage}
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Вперёд"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Контент */}
          {viewMode === "year" ? (
            <div className="flex-1 flex items-center justify-center">
              {/* Режим выбора месяца */}
              <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 w-full">
                {Array.from({ length: 12 }).map((_, m) => {
                  const monthDate = localDate(currentYear, m + 1, 1);
                  const isSelectedMonth = value
                    ? value.year === currentYear && value.month === m + 1
                    : false;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectMonth(m + 1)}
                      className={cn(
                        "h-9 text-sm rounded-md flex items-center justify-center transition-colors",
                        isSelectedMonth
                          ? "bg-primary text-primary-foreground font-bold"
                          : value === null &&
                              today.year === currentYear &&
                              today.month === m + 1
                            ? "bg-accent text-foreground font-semibold"
                            : "hover:bg-accent",
                      )}
                    >
                      {format(localToDate(monthDate), "MMM", {
                        locale: ru,
                      }).replace(".", "")}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            (() => {
              const currentMonth = viewDate.month;
              // Дней в месяце через Temporal
              const daysInMonth = viewDate.daysInMonth;
              // ISO day of week: 1=Mon, 7=Sun → padding for Mon-start grid
              // Важно: берём от первого числа месяца, а не от viewDate!
              const firstOfMonth = localDate(currentYear, currentMonth, 1);
              const padding = firstOfMonth.dayOfWeek - 1;

              return (
                <>
                  {/* Дни недели */}
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                    {WEEKDAY_NAMES.map((d) => (
                      <div
                        key={d}
                        className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Ячейки дней */}
                  <div
                    className="grid grid-cols-7 gap-0.5"
                    key={`${currentYear}-${currentMonth}`}
                  >
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayDate = localDate(
                        currentYear,
                        currentMonth,
                        dayNum,
                      );
                      const isSelected = value ? value.equals(dayDate) : false;
                      const isTodayFlag = today.equals(dayDate);

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelect(dayDate)}
                          style={
                            i === 0
                              ? { gridColumnStart: padding + 1 }
                              : undefined
                          }
                          className={cn(
                            "h-8 w-10 text-sm rounded-md flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground font-bold"
                              : isTodayFlag
                                ? "bg-accent text-foreground font-semibold"
                                : "hover:bg-accent",
                          )}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
