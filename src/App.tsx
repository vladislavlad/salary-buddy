import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/Settings/SettingsForm';
import { YearCalendar } from '@/components/Calendar/YearCalendar';
import { BonusManager } from '@/components/Bonus/BonusManager';
import { useSettings } from '@/hooks/useSettings';
import { useBonuses } from '@/hooks/useBonuses';
import { useCalendar } from '@/hooks/useCalendar';
import { useSalaryCalculation } from '@/hooks/useSalaryCalculation';
import { formatCurrency } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();

export function App() {
  const [showSettings, setShowSettings] = useState(true);
  const [showBonuses, setShowBonuses] = useState(false);
  const { settings, updateSettings, initializeSettings } = useSettings();
  const { bonuses, addBonus, removeBonus } = useBonuses();
  const { data: calendarData, isLoading } = useCalendar(CURRENT_YEAR);
  const calculation = useSalaryCalculation(settings, bonuses, calendarData ?? null, CURRENT_YEAR);

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-2xl font-bold">Salary Buddy</h1>
            <p className="text-muted-foreground">
              Калькулятор зарплаты с учётом НДФЛ и производственного календаря РФ
            </p>
            <Button onClick={initializeSettings} size="lg">
              Начать расчёт
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Salary Buddy</h1>
            <p className="text-muted-foreground text-sm">
              Расчёт зарплаты за {CURRENT_YEAR} год с учётом НДФЛ и календаря РФ
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Панель настроек */}
        <Card>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              <h2 className="font-semibold">Настройки зарплаты</h2>
            </div>
            {showSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showSettings && (
            <CardContent className="px-4 pb-4">
              <SettingsForm settings={settings} onChange={updateSettings} />
            </CardContent>
          )}
        </Card>

        {/* Премии */}
        <Card>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setShowBonuses(!showBonuses)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">+</span>
              <h2 className="font-semibold">Дополнительный доход (премии)</h2>
            </div>
            {showBonuses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showBonuses && (
            <CardContent className="px-4 pb-4">
              <BonusManager bonuses={bonuses} onAdd={addBonus} onRemove={removeBonus} />
            </CardContent>
          )}
        </Card>

        {/* Итоги */}
        {calculation && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Оклад за год</CardTitle>
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

        {/* Календарь */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <CardTitle>Календарь выплат {CURRENT_YEAR}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Загрузка календаря...</p>
            ) : calculation ? (
              <YearCalendar
                year={CURRENT_YEAR}
                payments={calculation.payments}
                calendarData={calendarData ?? null}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">Настройте параметры зарплаты</p>
            )}

            {/* Легенда */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300" />
                <span>Выплата ЗП</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 text-red-500" />
                <span>Выходной / праздник</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300" />
                <span>Сегодня</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
