import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Settings2, Calendar as CalendarIcon, Umbrella } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/Settings/SettingsForm';
import { YearCalendar } from '@/components/Calendar/YearCalendar';
import { BonusManager } from '@/components/Bonus/BonusManager';
import { VacationManager } from '@/components/Vacation/VacationManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSettings } from '@/hooks/useSettings';
import { useBonuses } from '@/hooks/useBonuses';
import { useVacations } from '@/hooks/useVacations';
import { useVacationSettings } from '@/hooks/useVacationSettings';
import { useCalendar } from '@/hooks/useCalendar';
import { useSalaryCalculation } from '@/hooks/useSalaryCalculation';
import { formatCurrency } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();

export function App() {
  const [showSettings, setShowSettings] = useState(true);
  const [showBonuses, setShowBonuses] = useState(false);
  const [showVacations, setShowVacations] = useState(false);
  const { settings, updateSettings } = useSettings();
  const { bonuses, addBonus, removeBonus } = useBonuses();
  const { vacations, addVacation, removeVacation } = useVacations();
  const { settings: vacationSettings, updateSettings: updateVacationSettings } = useVacationSettings();
  const { data: calendarData, isLoading } = useCalendar(CURRENT_YEAR);
  const calculation = useSalaryCalculation(settings, bonuses, vacations, vacationSettings, calendarData ?? null, CURRENT_YEAR);

  return (
    <div className="flex flex-col min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <header className="border-b bg-card-secondary shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Salary Buddy</h1>
            <p className="text-muted-foreground text-sm">
              Расчёт зарплаты за {CURRENT_YEAR} год с учётом НДФЛ и календаря РФ
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 px-4 py-6 lg:px-6 lg:py-8 lg:gap-3 flex-1 overflow-hidden">
        {/* Левая колонка — настройки */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 space-y-6 lg:h-full lg:min-h-0 lg:overflow-y-auto sidebar-scroll">
          <div className="space-y-6 pb-6 pr-2 lg:pr-4">
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
              <SettingsForm settings={settings} onChange={updateSettings} />
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
              <BonusManager bonuses={bonuses} onAdd={addBonus} onRemove={removeBonus} />
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
              <VacationManager
                vacations={vacations}
                onAdd={addVacation}
                onRemove={removeVacation}
                vacationSettings={vacationSettings}
                onUpdateVacationSettings={updateVacationSettings}
              />
            </CardContent>
            )}
          </Card>
          </div>
        </aside>

        {/* Правая колонка — календарь и итоги */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Календарь */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-4 px-6 pt-6 shrink-0">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <h2 className="font-semibold leading-none tracking-tight">Календарь выплат {CURRENT_YEAR}</h2>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-4 pt-0 flex flex-col flex-1 min-h-0">
              {/* Скроллируемая область календаря */}
              <div className="flex-1 overflow-y-auto calendar-scroll">
                <div className="pr-3">
                  {isLoading || !calendarData ? (
                    <p className="text-muted-foreground text-center py-8">Загрузка календаря...</p>
                  ) : calculation ? (
                    <YearCalendar
                      year={CURRENT_YEAR}
                      payments={calculation.payments}
                      bonusPayments={calculation.bonusPayments}
                      vacationDays={calculation.vacationDays}
                      calendarData={calendarData}
                    />
                  ) : null}
                </div>
              </div>

              {/* Легенда — прижата к низу */}
              <div className="flex items-center gap-5 mt-3 pt-2 border-t shrink-0 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 dark:bg-green-900/40 dark:border-green-700" />
                  <span>Выплата ЗП</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300 dark:bg-purple-900/40 dark:border-purple-700" />
                  <span>Отпускные</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 dark:bg-blue-900/40 dark:border-blue-700" />
                  <span>Премия</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-700" />
                  <span>Сегодня</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-gray-200 border border-gray-300 dark:bg-gray-600/50 dark:border-gray-500" />
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
                  <p className="text-xl font-bold">{formatCurrency(calculation.totalGross)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">НДФЛ за год</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(calculation.totalNdfl)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">На руки за год</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(calculation.totalNet)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
