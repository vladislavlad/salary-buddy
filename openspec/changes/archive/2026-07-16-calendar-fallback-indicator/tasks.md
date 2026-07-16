## 1. Модель — отслеживание источника данных

- [x] 1.1 Изменить `fetchCalendar(year)` → возвращать `{ data: CalendarData, isFallback: boolean }`
- [x] 1.2 Расширить `CalendarContextValue`: добавить `fallbackYears: Set<number>`
- [x] 1.3 Обновить `CalendarProvider`: извлекать `isFallback` из результата и заполнять `fallbackYears`

## 2. UI — индикатор в легенде календаря

- [x] 2.1 Добавить компонент индикатора справа внизу легенды (App.tsx): иконка AlertTriangle, текст «Не официальный производственный календарь РФ», Tooltip
- [x] 2.2 Подключить `fallbackYears` из контекста и рендерить индикатор только для текущего года с fallback

## 3. Тесты

- [x] 3.1 Обновить тесты стратегии: проверить, что `isFallback` корректно установлен (API → false, fallback → true)
- [x] 3.2 Проверить, что CalendarProvider правильно заполняет `fallbackYears`

## 4. Верификация

- [x] 4.1 Запустить `pnpm lint` и `pnpm test:run`
- [x] 4.2 Проверить в dev-режиме: индикатор отображается для 2027, не отображается для 2026
