# DOC — Архитектура и реализация Salary Buddy

## Архитектура

Проект организован по фичам. Верхнеуровневые папки `components`, `context`, `hooks`, `lib`, `services`, `types` не используются.

```text
src/
├── app/
│   ├── AppProviders.tsx        # композиция провайдеров приложения
│   └── repositories.ts         # wiring конкретных репозиториев
├── features/
│   ├── bonus/
│   │   ├── model/              # application service, provider, context, rules
│   │   ├── hooks/              # публичные React-хуки фичи
│   │   ├── repository/         # интерфейс и localStorage implementation
│   │   └── ui/                 # UI премий
│   ├── calendar/
│   │   ├── model/              # загрузка и provider производственного календаря
│   │   ├── hooks/              # доступ к календарному provider
│   │   └── ui/                 # годовой календарь
│   ├── import-export/
│   │   ├── model/              # import/export storage и JSON-операции
│   │   └── ui/                 # панель импорта и экспорта
│   ├── payments/
│   │   ├── model/
│   │   │   ├── calculation/    # расчётные модули: salary, vacation, surcharge, netGross и др.
│   │   │   └── ndfl.ts         # НДФЛ по прогрессивной шкале
│   │   ├── hooks/              # хуки платежей и календаря выплат
│   │   └── repository/         # (пустая – факты хранятся inline на Payment)
│   ├── salary/
│   │   ├── model/              # service, provider, context
│   │   ├── hooks/              # доступ к SalaryProvider
│   │   ├── repository/         # Salary repository
│   │   └── ui/                 # UI окладов
│   ├── salary-payment-settings/
│   │   ├── model/              # service, provider, defaults
│   │   ├── hooks/              # доступ к settings provider
│   │   └── repository/         # settings repository
│   ├── surcharge/
│   │   ├── model/              # application service, provider, context, rules
│   │   ├── hooks/              # публичные React-хуки фичи
│   │   ├── repository/         # интерфейс и localStorage implementation
│   │   └── ui/                 # UI доплат
│   ├── sick-leave/
│   │   ├── model/              # application service, provider, context, rules
│   │   ├── hooks/              # публичные React-хуки фичи
│   │   ├── repository/         # интерфейс и localStorage implementation
│   │   └── ui/                 # UI больничных
│   └── vacation/
│       ├── model/              # application service, service contract, provider, rules
│       ├── hooks/              # публичные React-хуки фичи
│       ├── repository/         # интерфейс и localStorage implementation
│       └── ui/                 # UI отпусков
├── shared/
│   ├── lib/                    # общие утилиты форматирования, денег, дат
│   ├── repository/             # общий Repository и LocalStorageRepository
│   ├── result.ts               # общий тип Result<T, E> для успешных/ошибочных операций
│   ├── types/                  # общие доменные типы и zod-схемы
│   └── ui/                     # базовые shadcn/ui и общие UI-компоненты
├── __tests__/
├── App.tsx
└── main.tsx
```

### Слои

**`app`** – композиция provider tree, создание конкретных localStorage-репозиториев. Допустим wiring зависимостей, но не доменная логика.

**`features/<feature>/model`** – application services, providers и context, доменные правила конкретной фичи. Application service управляет цепочкой: валидация → создание/изменение сущности → сохранение в репозиторий. UI не должен напрямую знать правила сохранения.

**`features/<feature>/hooks`** – публичные React-хуки фичи. Используют provider/context и application service, но не содержат расчётных правил.

**`features/<feature>/repository`** – интерфейсы репозиториев и конкретные persisted implementations. Для localStorage использовать `LocalStorage...Repository`.

**`features/<feature>/ui`** – тонкие UI-компоненты: принимают данные и callbacks через props или feature hooks, не содержат расчётной логики, не обращаются к `localStorage`, не создают сервисы на каждый render.

**`shared`** – общие утилиты без доменной привязки (`lib`), базовые repository abstractions (`repository`), типы и zod-схемы, используемые несколькими фичами (`types`), shadcn/ui primitives и общие UI-компоненты (`ui`). Бизнес-логику отдельной фичи в `shared` не класть.

## Данные и хранилища

Независимые изменяемые хранилища:

- **`Salary`** – полноценная сущность, история изменений оклада;
- **`SalaryPaymentSettings`** – настройки выплаты зарплаты (день аванса, день зарплаты, способ распределения);
- **`Surcharge`** – доплаты;
- **`Bonus`** – премии;
- **`Vacation`** – отпуска;
- **`SickLeave`** – больничные листы;
- **`SickLeaveSettings`** – настройки доплаты от работодателя (включена/выключена, лимит дней в году).

`Salary` и `SalaryPaymentSettings` остаются раздельными фичами и раздельными хуками: `useSalaryProvider()` и `useSalaryPaymentSettingsProvider()`.

### Payments – расчётный read model

`Payments` не редактируются напрямую, кроме механики подтверждения фактического gross. Факт хранится inline на платеже через опциональное поле `Payment.fact?: number`. При пересчёте engine собирает факты из существующих платежей в `Map<string, number>` (`factBySource`) и использует их вместо расчётного gross при подсчёте НДФЛ.

Расчёт платежей строится на основе: календарей, окладов, настроек выплаты зарплаты, доплат, премий, отпусков и фактических корректировок.

## State management

Состояние держится в feature providers:

- `SalaryProvider` – список записей оклада;
- `SalaryPaymentSettingsProvider` – настройки выплаты зарплаты;
- `SurchargeProvider` – доплаты;
- `BonusesProvider` – премии;
- `VacationsProvider` – отпуска;
- `SickLeavesProvider` – больничные листы и настройки доплаты;
- `CalendarProvider` – производственные календари, загружаются при открытии страницы;
- `PaymentsProvider` – расчёт выплат и фактические корректировки.

### Хуки

```
useSalaryProvider,          useSalaryService
useSalaryPaymentSettingsProvider,  useSalaryPaymentSettingsService
useSurchargeProvider,       useSurchargeService
useBonusesProvider,         useBonusesService
useVacationsProvider,       useVacations
useSickLeavesProvider,      useSickLeaves
usePaymentsForYear,         useCalendarForYear,  usePaymentsStore,  useYearSummary
useCalendar
```

## Производственный календарь

Данные загружаются из isdayoff.ru при открытии страницы и считаются стабильными для сессии:

```text
https://isdayoff.ru/api/getdata?year=YYYY&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}
```

Параметр `holiday=1` разделяет официальные праздники и выходные. Коды:

- `0` – рабочий день;
- `1` – нерабочий день;
- `2` – сокращённый рабочий день;
- `8` – официальный праздник.

Если дата выплаты попадает на выходной или праздник, использовать перенос назад на ближайший рабочий день через `findPreviousWorkday`.

## Ключевые правила расчёта

### НДФЛ 2026

Прогрессивная шкала (пороги в копейках):

| Накопленный доход | Ставка |
|---|---:|
| До 2 400 000 ₽ | 13% |
| 2.4 – 5 млн ₽ | 15% |
| 5 – 20 млн ₽ | 18% |
| 20 – 50 млн ₽ | 20% |
| Свыше 50 млн ₽ | 22% |

Ставка применяется только к сумме превышения порога. НДФЛ считается от накопленного дохода с начала года методом разницы: `НДФЛ = tax(accumulated + gross) - tax(accumulated)`.

Реализация: `features/payments/model/ndfl.ts` – функция `calculateNdflForPayment(paymentGrossKop, previousAccumulatedIncomeKop, year)` возвращает `{ ndfl, newAccumulatedIncome, newTotalTax, breakdown }`.

Годовой накопленный доход (`accumulatedIncomeKop`) обнуляется при переходе в новый календарный год. Доплаты (`surcharge`) не участвуют в НДФЛ и не увеличивают накопленный доход.

### Оклад

Для даты берётся оклад из записи с ближайшей `effectiveDate` не позднее этой даты.

### Распределение зарплаты

Два режима:

1. **`fifty-fifty`** – аванс = 50% оклада, зарплата = 50% оклада.
2. **`by-worked-days`** – аванс пропорционален рабочим дням с 1 по 15, остаток в зарплате.

Аванс выплачивается на `advancePaymentDay` месяца M, зарплата – на `salaryPaymentDay` месяца M+1. В декабре зарплата выплачивается за 1 рабочий день до последнего рабочего дня месяца.

### Премии

- **`salaries`** – gross = amount × текущий оклад;
- **`custom`** – фиксированная gross-сумма до НДФЛ.

Премия учитывается в накопленном доходе и влияет на ставку НДФЛ для последующих выплат.

### Отпуска

`Vacation` хранит `startDate`, `calendarDays`, `dates[]`; `endDate` не хранится.

`computeVacationDates()` исключает официальные праздники: отпуск автоматически продлевается по правилам ТК РФ. Количество календарных дней ограничено диапазоном 1–28.

**Отпускные (реальная формула):**

```
СДЗ = includedIncomeKop / includedDays
Отпускные за год = СДЗ × количество дней отпуска в этом году
```

Где:
- `includedIncomeKop` – сумма gross (или fact, если подтверждён) всех выплат кроме отпускных за 12 месяцев до месяца отпуска. Доход учитывается по месяцу начисления (`accrualDate`), а не по дате выплаты.
- `includedDays` – динамический знаменатель: каждый месяц расчётного периода вносит `AVG_MONTH_DAYS` (29.3), но месяцы, содержащие дни предыдущих оплачиваемых отпусков, скорректированы пропорционально фактическим не-отпускным дням: `(29.3 / календарных дней в месяце) × не-отпускные дни`.

Выплата отпускных – не позднее чем за 3 календарных дня до начала отпуска, с переносом на предыдущий рабочий день. Рабочие дни отпуска вычитаются из соответствующих выплат аванса и зарплаты.

Реализация: `features/payments/model/calculation/vacation.ts`.

### Больничные

`SickLeave` хранит `startDate`, `calendarDays`, `dates[]`; `endDate` не хранится. Даты — календарные, включая выходные и праздники (без продления по ТК РФ).

**Типы причин (`reason`):**
- `illness` — собственное заболевание / бытовая травма;
- `work-injury` — производственная травма;
- `child-care-under7` — уход за ребёнком < 7 лет;
- `child-care-7to15` — уход за ребёнком 7–15 лет.

**Страховой стаж (`experience`) и % оплаты:**
- `< 5 лет` → 60%;
- `5–8 лет` → 80%;
- `8+ лет` → 100%.

Производственная травма и уход за ребёнком < 7 лет — всегда 100%, независимо от стажа. Уход за ребёнком 7–15 лет: первые 10 дней — по стажу, с 11-го дня — 50% от СДЗ (ст. 7 ФЗ-255).

**Кто платит и за какие дни:**
- `illness`: дни 1–3 — работодатель (пособие), день 4+ — СФР;
- Остальные типы: все дни с 1-го — СФР.

**Среднедневной заработок (СДЗ):**
```
СДЗ = sum(gross/fact всех выплат за 2 предшествующих года) / 730
Fallback: оклад × 24 / 730 (на дату старта больничного, если данных нет)
Clamp: min(890,73 ₽), max(6 827,40 ₽/день) — для всех типов КРОМЕ производственной травмы.
```

База СДЗ включает все выплаты кроме больничных (включая отпускные — они облагаются страховыми взносами). При `work-injury` clamp по максимуму не применяется (ст. 9 ФЗ-125), но действует ежемесячный лимит пособия: не более 4× макс. ежемесячной страховой выплаты = **503 156,64 ₽** за каждый год-месяц больничного.

**Доплата от работодателя (`SickLeaveSettings`):**
Если `enableTopUp`: работодатель доплачивает разницу между дневным окладом (`оклад / рабочие дни в месяце`) и дневным пособием за каждый рабочий день больничного. Лимит дней с доплатой настраивается пользователем (по умолчанию 30 рабочих дней в году).

**Выплата:** дата = endDate больничного, с переносом на предыдущий рабочий день (`findPreviousWorkday`). Больничный может переходить через год — дни группируются по году-месяцу (`YYYY-MM`), события генерируются отдельно для каждого месяца.

**НДФЛ:**
- `sick-leave` (пособие работодателя, дни 1–3) — НДФЛ по прогрессивной шкале, участвует в накопленном доходе;
- `sick-leave-sfr` — без НДФЛ (СФР удержит самостоятельно), НЕ участвует в накопленном доходе;
- `sick-leave-topup` — НДФЛ по прогрессивной шкале, участвует в накопленном доходе.

**Вычет из зарплаты:** дни больничного объединяются с днями отпуска в `absenceDaysSet` и исключаются из расчёта аванса/зарплаты за соответствующие периоды.

Реализация: `features/payments/model/calculation/sick-leave.ts`.

### Фактические платежи

Пользователь может подтвердить фактический gross платежа через поле `Payment.fact`. При расчёте НДФЛ используется `fact ?? gross` для данного платежа, что влияет на накопленный доход и ставки НДФЛ для всех последующих выплат. Пересчёт каскадный: изменение факта одного платежа запускает перерасчёт всех платежей после него.

## Import/export

Фича расположена в `features/import-export`:

- `model/exportImport.ts` – сбор, валидация, импорт JSON;
- `model/storage.ts` – доступ к localStorage ключам;
- `ui/ImportExportPanel.tsx` – кнопки сохранения и загрузки файла.

Совместимость со старыми форматами не поддерживается. Не добавлять legacy adapters, runtime migrations и fallback-чтение старых ключей без отдельного запроса.

## Цветовая схема календаря

- Зелёный – зарплата, аванс.
- Фиолетовый – отпускные.
- Оранжевый — больничные выплаты (`sick-leave`, `sick-leave-topup`).
- Синий – премии.
- Серый – дни отпуска и больничного.
- Красный – выходной или праздник.

## Тесты

В тестах доменной логики и provider/service API не использовать настоящий `localStorage`. Вместо этого – mock repository или in-memory test storage (fixture из `src/__tests__/fixtures`). `localStorage` допустим только в тестах конкретной localStorage implementation или import/export storage.

На момент написания unit-тесты покрывают распределение оклада, отпускные и фактические платежи. Тесты на прогрессивный НДФЛ отсутствуют – рекомендуется добавить.

## Конвенции кода

- Строгий TypeScript, без `any`.
- Именованные экспорты по умолчанию.
- `camelCase` для переменных и функций, `PascalCase` для компонентов и типов.
- `zod` для валидации пользовательского ввода и данных из persisted storage.
- TanStack Query – только для асинхронной загрузки календарей.
- Комментарии только на русском языке и только когда они реально помогают.
