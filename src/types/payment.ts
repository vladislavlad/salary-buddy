// Разбивка НДФЛ по ставкам для одной выплаты
export interface TaxBracketBreakdown {
  rate: number; // ставка в % (13, 15, 18, 20, 22)
  amount: number; // сумма налога по этой ставке
}

// Информация о выплате (зарплата, аванс, отпускные, премия) — единый источник данных
export interface Payment {
  id: string; // sal:{year}:{month}:{a|b}, bon:{year}:{seq}, vac:{year}:{seq}
  date: Date; // фактическая дата выплаты (после смещения на выходные)
  originalDate?: Date; // исходная дата до смещения (нет у премий)
  type: 'advance' | 'salary' | 'vacation' | 'bonus';
  salaryAmount: number; // оклад на момент выплаты (0 для отпускных и «своя сумма» премии)
  gross: number; // плановая сумма до НДФЛ
  fact?: number; // фактическая gross-сумма (если подтверждена)
  ndfls: TaxBracketBreakdown[]; // разбивка НДФЛ по ставкам [{ставка, размер}, ...]
  ndfl: number; // итоговый НДФЛ = сумма всех элементов ndfls
  net: number; // на руки (рассчитан от fact если есть, иначе от gross)
  yearToDateGross: number; // накопленный gross с начала года после этой выплаты
  month?: number; // месяц выплаты (1-12, нет у премий)
}

// Результат расчёта зарплаты за год — единый массив выплат
export interface YearCalculation {
  payments: Payment[];
  vacationDays: Map<string, boolean>; // YYYY-MM-DD -> true для дней отпуска
}
