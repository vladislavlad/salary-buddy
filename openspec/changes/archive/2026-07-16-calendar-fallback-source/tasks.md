## 1. Fallback-генератор календаря

- [x] 1.1 Создать `generateFallbackCalendar(year): CalendarData` в `calendar.ts`: перебор всех дней года, код 1 для суббот/воскресений, код 8 для праздников ст. 112 ТК РФ, код 0 для остальных
- [x] 1.2 Добавить константу `STATE_HOLIDAYS: [month, day][]` со списком праздников (не входить в 1–7 января — они обрабатываются отдельно)

## 2. Обнаружение отсутствия данных и стратегия переключения

- [x] 2.1 Переименовать текущий `fetchCalendar` → `isdayoffFetch(year): Promise<CalendarData | null>`, добавить проверку `/^0+$/` после парсинга — вернуть `null` при совпадении
- [x] 2.2 Создать новый `fetchCalendar(year): Promise<CalendarData>`: вызвать `isdayoffFetch`, при `null` → `generateFallbackCalendar(year)`

## 3. Тесты

- [x] 3.1 Написать тесты для `generateFallbackCalendar`: выходные, праздники, рабочие дни, праздник в выходной
- [x] 3.2 Написать тесты для стратегии: isdayoff вернул null → fallback, isdayoff вернул данные → API

## 4. Верификация

- [x] 4.1 Запустить `pnpm lint` и `pnpm test:run`
- [x] 4.2 Проверить в dev-режиме: календарь 2027 корректно отображается с fallback (праздники + выходные)
