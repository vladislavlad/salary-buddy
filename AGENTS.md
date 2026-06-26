# AGENTS.md — Salary Buddy

## Обзор

Salary Buddy — React SPA для расчёта дат и сумм выплат в РФ: оклад, аванс, зарплата, доплаты, премии, отпускные, НДФЛ, производственный календарь.

Бэкенда нет. Данные пользователя хранятся в `localStorage`.

**Архитектура, хранилища, state management и правила расчёта описаны в [DOC.md](./DOC.md).** Перед внесением изменений — прочитать соответствующий раздел.

## Команды

```bash
pnpm install      # зависимости
pnpm dev          # dev-сервер
pnpm build        # сборка
pnpm preview      # просмотр сборки
pnpm lint         # линтинг
pnpm format       # форматирование
pnpm test         # тесты (watch)
pnpm test:run     # однократный запуск тестов
```

После изменений кода обязательно запускать `pnpm lint` и, если затронута расчётная логика — `pnpm test:run`.

## Структура проекта

Проект организован по фичам. Новые файлы класть в `src/features/<feature>` по слоям: `model`, `hooks`, `repository`, `ui`.

```text
src/
├── app/                      # provider tree, wiring репозиториев
├── features/                 # самостоятельные фичи
│   ├── bonus/                # премии
│   ├── calendar/             # производственный календарь
│   ├── import-export/        # экспорт/импорт JSON
│   ├── payments/             # расчётный read model выплат
│   ├── salary/               # оклад, история изменений
│   ├── salary-payment-settings/  # настройки выплаты
│   ├── surcharge/            # доплаты
│   └── vacation/             # отпуска
├── shared/                   # общие утилиты, типы, UI primitives
├── __tests__/                # тесты
├── App.tsx
└── main.tsx
```

**Не создавать** top-level папки `components`, `context`, `hooks`, `lib`, `services`, `types`, `entities`.

### Правила слоёв

- **`model`** — application services, providers/context, доменные правила. Service управляет цепочкой: валидация → создание/изменение → сохранение в репозиторий.
- **`hooks`** — публичные React-хуки фичи. Не превращать в место для расчётных правил.
- **`repository`** — интерфейс и localStorage implementation. Именование: `LocalStorage...Repository`.
- **`ui`** — тонкие компоненты: данные через props/hooks, без расчётной логики, без прямого доступа к `localStorage`, без создания сервисов на каждый render.
- **`shared/`** — только то, что реально используется несколькими фичами. Бизнес-логику отдельной фичи сюда не класть.

## Критические ограничения

### Расчётную логику не менять без отдельного запроса

Файлы `features/payments/model/calculation/` и `ndfl.ts` — ядро расчёта. Любое изменение формул, распределения, НДФЛ или отпускных только по прямому запросу пользователя.

### UI не менять при архитектурных рефакторингах без отдельного запроса

Если задача касается архитектуры, типов, слоёв — визуальную часть трогать не нужно.

### Salary и SalaryPaymentSettings — раздельные фичи

`useSalaryProvider()` и `useSalaryPaymentSettingsProvider()` должны оставаться независимыми. Не склеивать настройки выплаты с сущностью оклада.

### Payments — read model

Платежи рассчитываются и не редактируются напрямую. Пользователь может только установить фактическую сумму платежа. 
В UI вводим net, приложение рассчитывает gross и сохраняет его в `Payment.fact`. Отдельного хранилища PaymentFacts нет.

### Import/export

Совместимость со старыми форматами не нужна. Не добавлять legacy adapters, runtime migrations и fallback-чтение старых ключей без отдельного запроса.

## Тесты

- В тестах доменной логики и provider/service API — **не использовать** настоящий `localStorage`. Использовать mock repository или in-memory storage из `src/__tests__/fixtures`.
- `localStorage` допустим только в тестах конкретной localStorage implementation или import/export storage.

## Конвенции кода

- Строгий TypeScript, без `any`.
- Именованные экспорты по умолчанию.
- `camelCase` — переменные и функции; `PascalCase` — компоненты и типы.
- `zod` для валидации пользовательского ввода и данных из persisted storage.
- TanStack Query — только для асинхронной загрузки календарей.
- Комментарии только на русском языке, только когда без них непонятно.
