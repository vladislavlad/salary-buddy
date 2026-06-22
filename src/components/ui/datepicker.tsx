import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { addMonths, format, getDaysInMonth, getYear, startOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, WEEKDAY_NAMES } from '@/lib/utils';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

const POPUP_HEIGHT = 280;
const POPUP_WIDTH = 310;

export function DatePicker({ value, onChange, placeholder = 'Выберите дату', className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? startOfMonth(value) : startOfMonth(new Date()));
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

    // Если не влезает снизу — показываем над кнопкой
    if (top + POPUP_HEIGHT > viewportH) {
      top = triggerRect.top - POPUP_HEIGHT - 8;
    }

    // Если не влезает справа — сдвигаем влево
    if (left + POPUP_WIDTH > viewportW) {
      left = viewportW - POPUP_WIDTH - 16;
    }

    // Не уходим за левый край
    if (left < 8) {
      left = 8;
    }

    setPopupStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 50,
    });
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setViewDate(startOfMonth(value));
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback((day: Date) => {
    onChange(day);
    setIsOpen(false);
  }, [onChange]);

  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));

  const currentMonth = viewDate.getMonth();
  const currentYear = getYear(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfWeek = startOfMonth(viewDate).getDay();
  const padding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Кэшируем сегодняшнюю дату вне цикла
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = getYear(today);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card-secondary px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          !value && 'text-muted-foreground',
          className,
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value ? format(value, 'd MMMM yyyy', { locale: ru }) : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 shrink-0 opacity-50">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      </button>

      {isOpen && (
        <div ref={popupRef} style={popupStyle} className="rounded-lg border bg-card-secondary text-card-foreground popover-shadow p-4 animate-in fade-in zoom-in-95">
          {/* Навигация по месяцам */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-accent transition-colors" aria-label="Предыдущий месяц">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">{format(viewDate, 'MMMM yyyy', { locale: ru })}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-accent transition-colors" aria-label="Следующий месяц">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Ячейки дней */}
          <div className="grid grid-cols-7 gap-1" key={`${currentYear}-${currentMonth}`}>
            {Array.from({ length: padding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = value?.getDate() === dayNum && value.getMonth() === currentMonth && getYear(value) === currentYear;
              const isToday = todayDate === dayNum && todayMonth === currentMonth && todayYear === currentYear;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(new Date(currentYear, currentMonth, dayNum))}
                  className={cn(
                    'h-9 w-10 text-sm rounded-md flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isToday
                        ? 'bg-accent text-foreground font-semibold'
                        : 'hover:bg-accent',
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
