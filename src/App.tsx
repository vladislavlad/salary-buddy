import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Plus, Settings2, Calendar as CalendarIcon, Umbrella } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalaryManager } from '@/components/Salary/SalaryManager';
import { YearCalendar } from '@/components/Calendar/YearCalendar';
import { BonusManager } from '@/components/Bonus/BonusManager';
import { VacationManager } from '@/components/Vacation/VacationManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SalaryProvider } from '@/context/SalaryProvider';
import { useSalaryProvider } from '@/hooks/useSalaryProvider';
import { BonusesProvider } from '@/context/BonusesProvider';
import { VacationsProvider } from '@/context/VacationsProvider';
import { PaymentsProvider } from '@/context/PaymentsProvider';
import { FactsProvider } from '@/context/FactsProvider';
import { usePaymentsForYear, useCalendarForYear } from '@/hooks/usePaymentsHooks';
import { Money } from '@/components/ui/money';
import { MIN_DISPLAY_YEAR, MAX_DISPLAY_YEAR } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

const CURRENT_YEAR = new Date().getFullYear();

function AppContent() {
  const [showSettings, setShowSettings] = useState(true);
  const [showBonuses, setShowBonuses] = useState(false);
  const [showVacations, setShowVacations] = useState(false);
  const [displayYear, setDisplayYear] = useState(CURRENT_YEAR);

  const { settings, updateSettings } = useSalaryProvider();

  const calendarData = useCalendarForYear(displayYear);
  const calculation = usePaymentsForYear(displayYear);

  // Итоги за год — суммируем из единого массива выплат
  const totalGross = useMemo(() => {
    if (!calculation) return 0;
    return calculation.payments.reduce((s, p) => s + (p.fact ?? p.gross), 0);
  }, [calculation]);
  const totalNdfl = useMemo(() => {
    if (!calculation) return 0;
    return calculation.payments.reduce((s, p) => s + p.ndfl, 0);
  }, [calculation]);
  const totalNet = useMemo(() => {
    if (!calculation) return 0;
    return calculation.payments.reduce((s, p) => s + p.net, 0);
  }, [calculation]);

  const canGoPrev = displayYear > MIN_DISPLAY_YEAR;
  const canGoNext = displayYear < MAX_DISPLAY_YEAR;

  return (
    <div className="flex flex-col min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <header className="border-b bg-card-secondary shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Salary Buddy</h1>
            <p className="text-muted-foreground text-sm">
              Расчёт зарплаты с учётом НДФЛ и календаря РФ
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 px-4 py-6 lg:px-6 lg:py-8 lg:gap-3 flex-1 overflow-hidden">
        {/* Левая колонка — настройки */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 space-y-6 lg:h-full lg:min-h-0 lg:overflow-y-auto sidebar-scroll pr-2 lg:pr-4">

            {/* Панель настроек */}
            <Card>
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setShowSettings(!showSettings)}
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  <h2 className="font-semibold leading-none tracking-tight">Настройки зарплаты</h2>
                </div>
                {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showSettings && (
                <CardContent className="px-6 pb-4">
                  <SalaryManager settings={settings} onChange={updateSettings} />
                </CardContent>
              )}
            </Card>

            {/* Премии */}
            <Card>
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setShowBonuses(!showBonuses)}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <h2 className="font-semibold leading-none tracking-tight">Премии</h2>
                </div>
                {showBonuses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showBonuses && (
                <CardContent className="px-6 pb-4">
                  <BonusManager />
                </CardContent>
              )}
            </Card>

            {/* Отпуска */}
            <Card>
              <button
                className="w-full flex items-center justify-between p-6 text-left"
                onClick={() => setShowVacations(!showVacations)}
              >
                <div className="flex items-center gap-2">
                  <Umbrella className="w-5 h-5" />
                  <h2 className="font-semibold leading-none tracking-tight">Отпуска</h2>
                </div>
                {showVacations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showVacations && (
                <CardContent className="px-6 pb-4">
                  <VacationManager />
                </CardContent>
              )}
            </Card>
        </aside>

        {/* Правая колонка — календарь и итоги */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Календарь */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-4 px-6 pt-6 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <h2 className="font-semibold leading-none tracking-tight">Календарь выплат</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canGoPrev}
                    onClick={() => setDisplayYear((y) => y - 1)}
                    className="h-8 w-8"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </Button>
                  <span className="text-lg font-bold min-w-[48px] text-center">{displayYear}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canGoNext}
                    onClick={() => setDisplayYear((y) => y + 1)}
                    className="h-8 w-8"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-4 pt-0 flex flex-col flex-1 min-h-0">
              {/* Скроллируемая область календаря */}
              <div className="flex-1 overflow-y-auto calendar-scroll">
                <div className="pr-3 min-h-full">
                  {!calendarData ? (
                    <p className="text-muted-foreground text-center py-8">Загрузка календаря...</p>
                  ) : (
                    <YearCalendar
                      year={displayYear}
                      payments={calculation?.payments ?? []}
                      vacationDays={calculation?.vacationDays ?? new Map()}
                      calendarData={calendarData}
                    />
                  )}
                </div>
              </div>

              {/* Легенда — прижата к низу */}
              <div className="flex items-center gap-5 mt-3 pt-2 border-t shrink-0 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: 'var(--pay-salary-bg)', borderColor: 'var(--pay-salary-border)' }} />
                  <span>Выплата ЗП</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: 'var(--pay-vacation-bg)', borderColor: 'var(--pay-vacation-border)' }} />
                  <span>Отпускные</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: 'var(--pay-bonus-bg)', borderColor: 'var(--pay-bonus-border)' }} />
                  <span>Премия</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md border" style={{ backgroundColor: 'var(--vac-day-bg)', borderColor: 'var(--vac-day-border)' }} />
                  <span>Отпуск</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Итоги */}
          {calculation && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Общий доход (до НДФЛ)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold"><Money amount={totalGross} /></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">НДФЛ за год</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-500"><Money amount={totalNdfl} /></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">На руки за год</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600"><Money amount={totalNet} /></p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function App() {
  return (
    <SalaryProvider>
      <BonusesProvider>
        <VacationsProvider>
          <FactsProvider>
            <PaymentsProvider>
              <TooltipProvider delayDuration={200}>
                <AppContent />
              </TooltipProvider>
            </PaymentsProvider>
          </FactsProvider>
        </VacationsProvider>
      </BonusesProvider>
    </SalaryProvider>
  );
}

export default App;
