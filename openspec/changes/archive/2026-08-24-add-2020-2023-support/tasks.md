## 1. Настройки по годам (yearSettings)

- [x] 1.1 Добавить строки 2020, 2021, 2022, 2023 в `YEAR_SETTINGS` (`src/shared/lib/yearSettings.ts`): `mrotKop`, `workInjuryMonthlyBenefitKop`, `ndflBrackets`, `rcSeparateBase`. Строка 2020 — полная (все поля). 2020 — плоская шкала 13%; 2021–2023 — 13% до 5 млн, 15% свыше; `rcSeparateBase` для 2020–2023 — `{ salary: false, averageEarnings: false }`.
- [x] 1.2 Расширить `CONTRIBUTION_BASE_BY_YEAR` назад до 2018: добавить 2018, 2019, 2020, 2021 (для лимитов СДЗ 2020–2023).
- [x] 1.3 Значения зафиксированы в spec по первоисточникам; при внедрении сверить копейные значения в коде с таблицей spec `year-settings` (предельные базы взносов 2018–2021 и макс. выплата по травме 2020–2023 — постановления Правительства РФ от 29.01.2020 № 61, от 28.01.2021 № 73, от 27.01.2022 № 57, от 30.01.2023 № 119); расхождений быть не должно.
- [x] 1.4 Добавить в `yearSettings` конфигурацию праздничных дней по годам (список дат, код 8; для 2020–2027 — праздники ст. 112 ТК РФ: 1–6 января и 8 января, 23.02, 08.03, 01.05, 09.05, 12.06, 04.11) и функцию получения списка праздничных дней для года.

## 2. Настройка приложения «учитывать ковидные дни»

- [x] 2.1 Добавить тип `CalendarSettings { accountForCoronavirusDays: boolean }` и zod-схему в `src/shared/types` (вынести в общий файл типов календаря).
- [x] 2.2 В `src/features/calendar/repository` создать `CalendarSettingsRepository` (интерфейс) и `LocalStorageCalendarSettingsRepository` (имплементация, ключ в localStorage).
- [x] 2.3 В `src/features/calendar/model` создать `CalendarSettingsProvider` + контекст (загружает настройку, по умолчанию `false`); в `src/features/calendar/hooks` — `useCalendarSettings`.
- [x] 2.4 Подключить репозиторий в `src/app/repositories.ts` и обернуть `CalendarProvider` провайдером настройки в `src/app/AppProviders.tsx`.

## 3. Загрузка календаря: ковидные дни и код 8

- [x] 3.1 В `isdayoffFetch` (`src/features/calendar/model/isdayoff-fetch.ts`) добавить в URL параметр `covid=1`; распознавать код 4 (в `CalendarData` его сохранять, не маппить).
- [x] 3.2 В `fetchCalendar` (`src/features/calendar/model/calendar.ts`) принять `accountForCoronavirus: boolean`; в режиме «без учёта» (`!accountForCoronavirus`) заменять каждый код 4 на 0 (рабочий день).
- [x] 3.3 В `fetchCalendar` наложить конфигурацию праздничных дней из `yearSettings` (задача 1.4) поверх загруженного календаря: установить код 8 праздничным дням года, независимо от кода провайдера (чинит код 1 → 8 для 2020–2021; для 2022+ идемпотентно).
- [x] 3.4 В `CalendarProvider` читать `accountForCoronavirusDays` через `useCalendarSettings`, передавать в `fetchCalendar`; включить значение настройки в ключ запроса TanStack Query.
- [x] 3.5 В `generateFallbackCalendar` (`src/features/calendar/model/calendar-fallback.ts`) заменить праздник января «1–7 января» на 1–6 января и 8 января (те же даты, что в задаче 1.4).

## 4. UI

- [x] 4.1 Проверить, что ковидные дни (после маппинга в код 0) отрисовываются в `DayCell` как обычные рабочие дни без отдельной визуальной отметки. Ожидаемый результат: изменения UI не требуются (режим «без учёта»).

## 5. Тесты

- [x] 5.1 Тесты `yearSettings`: `getYearSettings` для 2020–2023 (МРОТ, шкалы НДФЛ, `rcSeparateBase`, макс. выплата по травме), `MIN_DISPLAY_YEAR` = 2020 / `MAX_DISPLAY_YEAR` = 2027, fallback для 2019 → настройки 2020, `getContributionBase` для 2018–2021; состав праздничных дней года: январь = 1, 2, 3, 4, 5, 6, 8, 7 января отсутствует.
- [x] 5.2 Тесты `isdayoffFetch`: в URL передаётся `covid=1`; код 4 из ответа сохраняется в `CalendarData`.
- [x] 5.3 Тесты `fetchCalendar`: в режиме «без учёта» код 4 → 0; для календаря без кода 8 госпраздники (например, 04.11.2020) получают код 8; в fallback-календаре 2020: 08.01.2020 получает код 8, 07.01.2020 — нет; `computeVacationDates` для отпуска с 03.11.2020: 04.11.2020 не входит в 14 дней отпуска.
- [x] 5.4 Тесты настройки календаря: по умолчанию `accountForCoronavirusDays = false`; сохранённое значение восстанавливается. Использовать InMemoryRepository/mock, не настоящий `localStorage` (кроме теста конкретной localStorage-имплементации).

## 6. Финальная проверка

- [x] 6.1 Запустить `pnpm lint` и исправить замечания.
- [x] 6.2 Запустить `pnpm test:run` и убедиться, что все тесты проходят.
