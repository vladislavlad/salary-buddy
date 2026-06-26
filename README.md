# Salary Buddy

Клиентский калькулятор зарплаты с учётом НДФЛ, производственного календаря РФ, премий, доплат, отпусков и пользовательских корректировок фактических выплат.

## Что делает приложение

Salary Buddy рассчитывает календарь выплат на год:

- оклад, аванс и зарплату;
- доплаты;
- премии;
- отпускные;
- НДФЛ по прогрессивной шкале;
- суммы на руки;
- перенос дат выплат с выходных и праздников на предыдущий рабочий день;
- фактический gross платежа, если пользователь подтвердил отличающуюся сумму.

Приложение работает как SPA без бэкенда. Данные пользователя сохраняются в `localStorage`.

## Стек

- React 19 + TypeScript + Vite
- pnpm
- TanStack Query для загрузки производственного календаря
- React Context + Provider для клиентского состояния
- shadcn/ui + Tailwind CSS
- date-fns и `@js-temporal/polyfill`
- zod для валидации данных
- Vitest + Testing Library

## Архитектура

Проект организован по фичам. Верхнеуровневые папки `components`, `context`, `hooks`, `lib`, `services`, `types` больше не используются.

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
│   │   └── repository/         # PaymentFacts repository
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

## Данные и хранилища

Базовые пользовательские данные разделены по независимым хранилищам:

- `Salary` — история изменений оклада;
- `SalaryPaymentSettings` — день аванса, день зарплаты и способ распределения;
- `Surcharge` — доплаты;
- `Bonus` — премии;
- `Vacation` — отпуска;
- `PaymentFacts` — подтверждённые фактические gross-суммы платежей.

`Payments` не редактируются напрямую. Они рассчитываются из окладов, настроек выплат, доплат, премий, отпусков, календарей и фактических корректировок.

Каждая изменяемая фича имеет свой репозиторий и application service. Сервис отвечает за цепочку: валидация, создание или изменение сущности, сохранение в репозиторий. UI-компоненты остаются тонкими и не знают деталей хранения.

## State management

Состояние держится в feature providers:

- `SalaryProvider` — список записей оклада;
- `SalaryPaymentSettingsProvider` — настройки выплаты зарплаты;
- `SurchargeProvider` — доплаты;
- `BonusesProvider` — премии;
- `VacationsProvider` — отпуска;
- `CalendarProvider` — производственные календари, загружаются при открытии страницы;
- `PaymentsProvider` — расчёт выплат и фактические корректировки.

Хуки лежат в `features/<feature>/hooks` и дают доступ к provider/service API:

- `useSalaryProvider`, `useSalaryService`
- `useSalaryPaymentSettingsProvider`, `useSalaryPaymentSettingsService`
- `useSurchargeProvider`, `useSurcharge`
- `useBonusesProvider`, `useBonuses`
- `useVacationsProvider`, `useVacations`
- `usePaymentsForYear`, `useCalendarForYear`, `usePaymentsStore`, `useYearSummary`
- `useCalendar`

## Производственный календарь

Данные загружаются из isdayoff.ru:

```text
https://isdayoff.ru/api/getdata?year=YYYY&cc=ru&holiday=${SEPARATE_HOLIDAY_AND_WEEKEND}
```

Параметр `holiday=1` разделяет официальные праздники и выходные:

- `0` — рабочий день;
- `1` — нерабочий день;
- `2` — сокращённый рабочий день;
- `8` — официальный праздник.

Если дата выплаты попадает на выходной или праздник, она смещается назад на ближайший рабочий день через `findPreviousWorkday`.

## Ключевые правила расчёта

### НДФЛ 2026

| Накопленный доход за год | Ставка |
|---|---:|
| До 2 400 000 ₽ | 13% |
| 2 400 000 — 5 000 000 ₽ | 15% |
| 5 000 000 — 20 000 000 ₽ | 18% |
| 20 000 000 — 50 000 000 ₽ | 20% |
| Свыше 50 000 000 ₽ | 22% |

Повышенная ставка применяется только к сумме превышения порога. НДФЛ считается от накопленного дохода с начала года, затем из результата вычитается уже удержанный налог.

### Оклад и распределение зарплаты

Для любой даты берётся оклад из записи с ближайшей `effectiveDate` не позднее этой даты.

Доступны два режима распределения:

- `fifty-fifty` — аванс и зарплата по 50% от оклада;
- `by-worked-days` — аванс пропорционален рабочим дням с 1 по 15, остаток выплачивается зарплатой.

Аванс выплачивается в месяце начисления, зарплата — в следующем месяце. Декабрьская зарплата выплачивается до конца декабря.

### Премии и доплаты

Премии бывают двух типов:

- `salaries` — сумма в окладах, gross = количество окладов × текущий оклад;
- `custom` — фиксированная gross-сумма.

Премии участвуют в накопленном доходе и влияют на ставку НДФЛ для последующих выплат. Доплаты отображаются как отдельные платежи и не участвуют в годовых итогах зарплаты.

### Отпуска

`Vacation` хранит `startDate`, `calendarDays`, `type` и вычисленный массив `dates[]`; `endDate` не хранится.

`computeVacationDates()` исключает официальные праздники: отпуск автоматически продлевается по правилам ТК РФ. Количество календарных дней ограничено диапазоном 1–28.

Отпускные:

```text
СДЗ = доход12мес / 12 / 29,3
Отпускные = СДЗ × календарные дни отпуска
```

Выплата отпускных происходит не позднее чем за 3 календарных дня до начала отпуска, с переносом на предыдущий рабочий день.

Рабочие дни отпуска вычитаются из зарплаты и аванса:

- в режиме `by-worked-days` аванс считается только по рабочим дням без отпуска;
- в режиме `fifty-fifty` отпуск сначала вычитается из аванса, отрицательный остаток переносится на зарплату.

### Фактические платежи

Пользователь может подтвердить фактический gross платежа. При расчёте НДФЛ используется факт, если он задан для `paymentId`; иначе используется расчётный gross.

## Import/export

Экспорт и импорт работают с текущим форматом данных. Совместимость со старыми форматами не поддерживается.

Фича расположена в `features/import-export`:

- `model/exportImport.ts` — сбор, валидация, импорт JSON;
- `model/storage.ts` — доступ к localStorage ключам;
- `ui/ImportExportPanel.tsx` — кнопки сохранения и загрузки файла.

## Цвета календаря

- зелёный — зарплатные выплаты;
- фиолетовый — отпускные;
- синий — премии;
- серый — дни отпуска;
- красный — выходные и праздники.

## Команды

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm format
pnpm test
pnpm test:run
```
