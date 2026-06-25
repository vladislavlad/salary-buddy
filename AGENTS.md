# AGENTS.md — Salary Buddy

## Обзор

Salary Buddy — React SPA для расчёта дат и сумм выплат в РФ: оклад, аванс, зарплата, доплаты, премии, отпускные, НДФЛ, производственный календарь и фактические корректировки платежей.

Бэкенда нет. Данные пользователя хранятся в `localStorage`.

## Стек

- React 19 + TypeScript + Vite + pnpm
- TanStack Query для асинхронной загрузки производственного календаря
- React Context + Provider для клиентского состояния
- shadcn/ui + Tailwind CSS
- date-fns и `@js-temporal/polyfill`
- zod для валидации пользовательских и persisted-данных
- Vitest + Testing Library

## Архитектурный стиль

Проект организован по фичам. Новые фичевые файлы нужно класть внутрь `src/features/<feature>` по назначению: `model`, `hooks`, `repository`, `ui`.

```text
src/
├── app/                      # композиция приложения и wiring зависимостей
├── features/                 # самостоятельные фичи
│   ├── bonus/
│   ├── calendar/
│   ├── import-export/
│   ├── payments/
│   ├── salary/
│   ├── salary-payment-settings/
│   ├── surcharge/
│   └── vacation/
├── shared/
│   ├── lib/                  # общие утилиты без доменной привязки
│   ├── repository/           # базовые repository abstractions
│   ├── types/                # общие доменные типы и zod-схемы
│   └── ui/                   # базовые UI primitives и общие UI-компоненты
├── __tests__/
├── App.tsx
└── main.tsx
```

Не возвращать старые top-level папки `components`, `context`, `hooks`, `lib`, `services`, `types`, `entities`.

## Слои

### `app`

- `AppProviders.tsx` собирает provider tree.
- `repositories.ts` создаёт конкретные localStorage-репозитории.
- Здесь допустим wiring зависимостей, но не доменная логика.

### `features/<feature>/model`

Здесь лежат:

- application services;
- providers и context;
- доменные правила конкретной фичи.

Application service должен управлять цепочкой: валидация, создание или изменение сущности, сохранение в репозиторий. UI не должен напрямую знать правила сохранения.

### `features/<feature>/hooks`

Публичные React-хуки фичи. Они могут использовать provider/context и application service, но не должны превращаться в место для расчётных правил.

### `features/<feature>/repository`

Интерфейсы репозиториев и конкретные persisted implementations. Для localStorage implementations использовать `LocalStorage...Repository`.

### `features/<feature>/ui`

UI-компоненты фичи. Они должны быть максимально тонкими:

- принимать данные и callbacks через props или feature hooks;
- не содержать расчётную доменную логику;
- не обращаться напрямую к `localStorage`;
- не создавать сервисы на каждый render без необходимости.

### `shared`

- `shared/ui` — shadcn/ui primitives, `ThemeToggle`, toast helpers, общие inputs.
- `shared/lib` — универсальные утилиты: форматирование, деньги, даты, `cn`.
- `shared/types` — типы и zod-схемы, которые реально используются несколькими фичами.
- `shared/repository` — общий `Repository<T>` и `LocalStorageRepository<T>`.

Не класть в `shared` бизнес-логику отдельной фичи.

## Доменные хранилища

Есть независимые изменяемые хранилища:

- `Salary` — полноценная сущность, история изменений оклада;
- `SalaryPaymentSettings` — простые настройки выплаты зарплаты;
- `Surcharge` — доплаты;
- `Bonus` — премии;
- `Vacation` — отпуска;
- `PaymentFacts` — подтверждённые фактические gross-суммы.

`Salary` и `SalaryPaymentSettings` должны оставаться раздельными фичами и раздельными хуками:

- `useSalaryProvider()`
- `useSalaryPaymentSettingsProvider()`

Не склеивать настройки выплаты зарплаты обратно с сущностью Salary.

## Payments

`Payments` — расчётный read model. Пользователь не редактирует платежи напрямую, кроме механики подтверждения фактического gross через `PaymentFacts`.

Расчёт платежей строится на основе:

- календарей;
- окладов;
- настроек выплаты зарплаты;
- доплат;
- премий;
- отпусков;
- фактических корректировок.

Логика НДФЛ и calculation engine живут в `features/payments/model`.

## Производственный календарь

Календарь загружается из isdayoff.ru при открытии страницы и дальше считается стабильным для сессии.

Endpoint:

```text
https://isdayoff.ru/api/getdata?year=YYYY&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}
```

Коды:

- `0` — рабочий;
- `1` — нерабочий;
- `2` — сокращённый;
- `8` — официальный праздник.

Если дата выплаты попадает на выходной или праздник, использовать перенос назад на ближайший рабочий день через `findPreviousWorkday`.

## Import/export

Фича import/export находится в `features/import-export`.

- `model/exportImport.ts` — сбор и импорт данных;
- `model/storage.ts` — доступ к ключам persisted storage;
- `ui/ImportExportPanel.tsx` — UI кнопок и file input.

Совместимость со старыми форматами не нужна. Не добавлять legacy adapters, runtime migrations и fallback-чтение старых ключей без отдельного запроса.

## Репозитории и тесты

Для persisted-данных использовать repository interface. В репозитории допустим `save`, который создаёт или заменяет сущность.

В тестах не использовать настоящий `localStorage`, если тестируется доменная логика или provider/service API. Вместо этого использовать mock repository или in-memory test storage, например fixture из `src/__tests__/fixtures`.

`localStorage` допустим только в тестах конкретной localStorage implementation или import/export storage.

## Ключевые правила расчёта

### НДФЛ 2026

| Накопленный доход | Ставка |
|---|---:|
| До 2 400 000 ₽ | 13% |
| 2.4 — 5 млн ₽ | 15% |
| 5 — 20 млн ₽ | 18% |
| 20 — 50 млн ₽ | 20% |
| Свыше 50 млн ₽ | 22% |

Ставка применяется только к сумме превышения порога. НДФЛ считается от накопленного дохода с начала года, затем вычитается уже уплаченный налог.

### Оклад

Для даты берётся оклад из записи с ближайшей `effectiveDate` не позднее этой даты.

### Распределение зарплаты

Два режима:

1. `fifty-fifty` — аванс = 50% оклада, зарплата = 50% оклада.
2. `by-worked-days` — аванс пропорционален рабочим дням с 1 по 15, остаток в зарплате.

Аванс платится на `advancePaymentDay` месяца M, зарплата — на `salaryPaymentDay` месяца M+1. В декабре зарплата выплачивается за 1 рабочий день до последнего рабочего дня месяца.

### Премии

- `salaries` — gross = amount × текущий оклад;
- `custom` — фиксированная gross-сумма до НДФЛ.

Премия учитывается в накопленном доходе.

### Отпуска

- `Vacation` хранит `startDate`, `calendarDays`, `dates[]`, без `endDate`.
- `computeVacationDates()` исключает официальные праздники.
- Количество дней: 1–28.
- Отпускные: `СДЗ = доход12мес / 12 / 29,3`, `Отпускные = СДЗ × календарных дней`.
- Выплата отпускных — не позднее чем за 3 календарных дня до начала отпуска, с переносом на предыдущий рабочий день.
- Рабочие дни отпуска вычитаются из соответствующих выплат.

## Цветовая схема календаря

- Зелёный — зарплата, аванс.
- Фиолетовый — отпускные.
- Синий — премии.
- Серый — дни отпуска.
- Красный — выходной или праздник.

## Команды

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm test
pnpm test:run
```

## Конвенции кода

- Строгий TypeScript, без `any`.
- Именованные экспорты по умолчанию.
- `camelCase` для переменных и функций.
- `PascalCase` для компонентов и типов.
- `zod` для валидации пользовательского ввода и данных из persisted storage.
- TanStack Query использовать для асинхронной загрузки календарей.
- Комментарии только на русском языке и только когда они реально помогают.
- UI не менять при архитектурных рефакторингах без отдельного запроса.
- Расчётную логику не менять без отдельного запроса.
