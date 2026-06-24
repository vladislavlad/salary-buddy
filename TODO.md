# DONE — Переработка модели отпуска (24 июня 2026)

## Что сделано
- Тип `Vacation`: `startDate` + `calendarDays` + `dates[]`, убран `endDate`
- `computeVacationDates(startDate, calendarDays, calendarData)` в `calendar.ts` — вычисляет N дней от startDate, исключая официальные праздники (по ТК РФ отпуск автоматически продлевается)
- Валидация: нельзя начать отпуск с официального праздника
- Форма: дата начала + кол-во календарных дней вместо двух дат
- `calculation-engine.ts`: использует `vacation.dates` для vacationDaysMap, vacationDaysSet и расчёта отпускных

## Изменённые файлы
- `src/types/vacation.ts` — новая схема Zod
- `src/services/calendar.ts` — добавлены `isOfficialHoliday`, `computeVacationDates`
- `src/context/VacationsProvider.tsx` — обновлён под новый тип
- `src/components/Vacation/VacationForm.tsx` — дата + кол-во дней, валидация праздника
- `src/components/Vacation/VacationCard.tsx` — использует `dates.length`, `dates[last]`
- `src/components/Vacation/VacationManager.tsx` — передаёт `calendarData` из PaymentsStore
- `src/lib/calculation-engine.ts` — использует `vacation.dates`, убраны дублирующие функции
