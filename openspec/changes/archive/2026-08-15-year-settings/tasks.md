# Tasks: Единая таблица настроек по годам

## 1. Реестр yearSettings

- [x] 1.1 Создать `src/shared/lib/yearSettings.ts`: тип `YearSettings { mrotKop, workInjuryMonthlyBenefitKop, ndflBrackets, rcSeparateBase: { salary, averageEarnings } }`, таблица `YEAR_SETTINGS: Record<number, Partial<YearSettings>>` 2024–2027 (копейки: МРОТ 1 924 200 / 2 244 000 / 2 709 300 / —; макс. выплата 10 878 404 / 11 911 852 / 12 578 916 / —; шкалы НДФЛ 2024 — 13/15, 2025–2027 — 13/15/18/20/22; `rcSeparateBase` 2024 — {false, false}, 2025 — {true, false}, 2026–2027 — {true, true}; строка 2027 — только шкала НДФЛ и `rcSeparateBase`), серия `CONTRIBUTION_BASE_BY_YEAR: Partial<Record<number, number>>` 2022–2026 (156 000 000 / 191 700 000 / 222 500 000 / 275 900 000 / 297 900 000), константа `RC_BASE_BRACKETS` (13% до 5 млн, 15% свыше)
- [x] 1.2 Аксессоры: `getYearSettings(year)` — clamp на [minKey, maxKey] + per-field разрешение (каждое поле — из ближайшего предыдущего года, где задано; возвращает полный объект), `getContributionBase(year)` — аналогично для серии баз, `getWorkInjuryMonthlyCapKop(date)` — 4 × макс. выплата, январь года N → настройки (N-1), `MIN_DISPLAY_YEAR` / `MAX_DISPLAY_YEAR` — min/max ключей таблицы

## 2. Перевод потребителей на реестр

- [x] 2.1 `sickLeaveLimits.ts`: удалить `MROT_BY_YEAR` и `CONTRIBUTION_BASE_BY_YEAR`, формулы лимитов СДЗ читают данные из `yearSettings.ts`; `getSickLeaveLimits(year)` сохранить без изменения сигнатуры
- [x] 2.2 `ndfl.ts`: удалить `NDFL_PROGRESSIVE_1/2`, `NDFL_CONFIGS` и локальный `RC_BASE_BRACKETS`; `getNdflConfig(year)` возвращает `getYearSettings(year).ndflBrackets`, `RC_BASE_BRACKETS` импортировать из `yearSettings.ts`; в `NdflRcOptions` заменить `rcBaseFromYear?: number` на `separateRcBase?: boolean` (условие `year >= rcBaseFromYear` убрать)
- [x] 2.3 `sick-leave.ts`: удалить `WORK_INJURY_MONTHLY_CAP_KOP`, применять `getWorkInjuryMonthlyCapKop` к ежемесячному чанку (месяц/год чанка)
- [x] 2.4 `index.ts`: заменить хардкод `rcBaseFromYear = AVERAGE_EARNINGS_PAYMENT_TYPES.has(type) ? 2026 : 2025` на запрос `getYearSettings(currentYear).rcSeparateBase[category]` и передавать `separateRcBase` в `calculateNdflForPayment`
- [x] 2.5 `shared/lib/utils.ts`: удалить константы `MIN_DISPLAY_YEAR` / `MAX_DISPLAY_YEAR`; обновить импорты в `App.tsx`, `calculation/index.ts`, `CalendarProvider.tsx` на `yearSettings.ts`

## 3. Тесты

- [x] 3.1 Unit-тесты реестра: значения 2024/2025/2026 (включая `rcSeparateBase` {false,false} / {true,false} / {true,true}), clamp (2023 → 2024, 2028 → 2027), `getWorkInjuryMonthlyCapKop` — февраль+ по году, январь по (N-1)
- [x] 3.2 Unit-тесты per-field fallback: 2027 — МРОТ/кап травмы из 2026, шкала НДФЛ и `rcSeparateBase` из 2027; установленное поле не затеняется предыдущим годом
- [x] 3.3 Интеграционные тесты капа по травме: 2024 → 43 513 616 коп, 2025 → 47 647 408 коп, 2026 → 50 315 664 коп, январь 2026 → лимит 2025
- [x] 3.4 Регрессия: существующие тесты (sick-leave-calculation, regional-coefficient, расчёты НДФЛ) проходят; в `regional-coefficient.test.ts` заменить `rcBaseFromYear: 2026` на флаг `separateRcBase` (2 места, тест «выплаты из среднего заработка»)
- [x] 3.5 Тест диапазона: `MIN_DISPLAY_YEAR` = 2024, `MAX_DISPLAY_YEAR` = 2027 (равно min/max ключам таблицы)

## 4. Верификация

- [x] 4.1 `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:run` — без ошибок
