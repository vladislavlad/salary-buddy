# PLAN — Фича «Больничные» (Sick Leave)

## Законодательная база (РФ, 2026)

### Лимиты

| Параметр | Значение |
|---|---|
| МРОТ | 27 093 ₽ |
| Предельная база 2024 / 2025 | 2 225 000 / 2 759 000 ₽ |
| Макс. СДЗ | (2 225 000 + 2 759 000) / 730 = **6 827,40 ₽/день** |
| Мин. СДЗ | 27 093 × 24 / 730 = **890,73 ₽/день** |

### Страховой стаж и % оплаты

> **Страховой стаж** — общий накопленный стаж, за который уплачивались страховые взносы в СФР. Не непрерывный и не в одной компании. Включает все периоды работы по трудовому договору у разных работодателей, военную службу, госслужбу, ИП с уплатой взносов.

| Стаж | % от СДЗ |
|---|---|
| < 5 лет | 60% |
| 5–8 лет | 80% |
| 8+ лет | 100% |

### Кто платит и за какие дни

| Тип больничного | Дни 1–3 | День 4+ | % по стажу |
|---|---|---|---|
| Собственное заболевание / бытовая травма (`illness`) | Работодатель (пособие) | СФР | 60/80/100% |
| Производственная травма (`work-injury`) | СФР (с 1 дня) | СФР | всегда 100%, без лимита базы |
| Уход за ребёнком < 7 лет (`child-care-under7`) | СФР (с 1 дня) | СФР | всегда 100% |
| Уход за ребёнком 7–15 лет (`child-care-7to15`) | СФР (с 1 дня) | СФР | первые 10 дней — по стажу, далее — 50% |

### НДФЛ

- **Пособие (весь больничный)** — полностью облагается НДФЛ по прогрессивной шкале. Освобождения до МРОТ нет (ст. 217 НК РФ исключила пособия из необлагаемых).
- **Доплата от работодателя** — полностью облагается НДФЛ + страховыми взносами.
- СФР часть не участвует в накопленном доходе для НДФЛ (СФР сам удержит). Доплата и пособие за дни 1–3 участвуют.

### Доплата от работодателя до оклада

Если включена:
- Работодатель доплачивает разницу между дневным пособием и дневным окладом (`оклад / рабочие дни в месяце`) за каждый день больничного.
- Лимит дней с доплатой в году настраивается пользователем (по умолчанию 30).
- Доплата — отдельный платёж, полностью облагается НДФЛ.

---

## Схема данных

### `src/shared/types/sick-leave.ts`

```typescript
SickLeaveReason:
  "illness"           // собственное заболевание / бытовая травма
  "work-injury"       // производственная травма
  "child-care-under7" // уход за ребёнком < 7 лет
  "child-care-7to15"  // уход за ребёнком 7–15 лет

SickLeaveExperience:
  "under5"    // < 5 лет → 60%
  "5to8"      // 5–8 лет → 80%
  "8plus"     // 8+ лет → 100%

SickLeave (сущность):
  id: string              // "sick:{year}:{seq}"
  startDate: LocalDate
  calendarDays: number    // кол-во календарных дней
  dates: LocalDate[]      // вычисленные дни больничного
  reason: SickLeaveReason
  experience: SickLeaveExperience

SickLeaveSettings (настройки):
  enableTopUp: boolean              // доплата до полного оклада
  topUpDaysLimitPerYear: number     // лимит дней с доплатой в году
```

---

## Порядок выполнения

### Этап 1 — Типы и схемы данных

**Файлы:** `shared/types/sick-leave.ts`, `shared/types/enums.ts`

- Zod-схемы для `SickLeave`, `SickLeaveSettings`, `SickLeaveCreateRequest`, `SickLeaveUpdateRequest`.
- Перечисления `SickLeaveReason`, `SickLeaveExperience`.
- Экспорт из `shared/types/index.ts`.

---

### Этап 2 — Репозитории

**Файлы:** `features/sick-leave/repository/SickLeaveRepository.ts`, `features/sick-leave/repository/SickLeaveSettingsRepository.ts`, `app/repositories.ts`

- `SickLeaveRepository` — type alias `Repository<SickLeave>`.
- `LocalStorageRepository("salary-buddy-sick-leaves", z.array(SickLeaveSchema))`.
- `SickLeaveSettingsRepository` — custom interface `get()`, `save()` (как SalaryPaymentSettings).
- `LocalStorageSickLeaveSettingsRepository` — ключ `"salary-buddy-sick-leave-settings"`.

---

### Этап 3 — Model слой (Service, Provider, Domain Rules)

**Файлы:** `features/sick-leave/model/`

- **`sickLeaveRules.ts`** — чистые функции:
  - `createSickLeave(request, existing)` → валидация + вычисление dates[] + генерация ID.
  - `updateSickLeave(request, existing)` → partial update + пересчёт dates[].
  - Правила: startDate не может быть праздником; calendarDays >= 1; даты считаются как календарные (включая выходные).

- **`SickLeaveService.ts`** — интерфейс CRUD.
- **`SickLeaveApplicationService.ts`** — реализация через repository + domain rules.
- **`SickLeaveSettingsService.ts`** — get/save settings с defaults `{ enableTopUp: false, topUpDaysLimitPerYear: 30 }`.
- **`SickLeavesContext.ts`** — context value с CRUD + settings.
- **`SickLeavesProvider.tsx`** — provider, оборачивает service + settings в context.

---

### Этап 4 — Hooks

**Файлы:** `features/sick-leave/hooks/`

- **`useSickLeavesProvider.ts`** — useContext wrapper (throw if outside provider).
- **`useSickLeaves.ts`** — TanStack Query hook, как `useVacations`.

---

### Этап 5 — UI компоненты

**Файлы:** `features/sick-leave/ui/`

- **`SickLeaveManager.tsx`** — главный компонент секции:
  ```
  ┌─ Настройки больничных ───────────────┐
  │ [ ] Доплата до полного оклада         │
  │   [30] дней с доплатой в году        │
  ├───────────────────────────────────────┤
  │ [SickLeaveCard]                       │
  │ [SickLeaveCard]                       │
  ├───────────────────────────────────────┤
  │ [+ Добавить больничный]               │
  ├───────────────────────────────────────┤
  │ [Info] подсказка о расчёте            │
  └───────────────────────────────────────┘
  ```

- **`SickLeaveCard.tsx`** — карточка: даты, тип причины, стаж %, edit/delete.
- **`SickLeaveForm.tsx`** — форма создания/редактирования:
  - DatePicker (startDate)
  - Number input (calendarDays)
  - Select (reason): «Собственное заболевание», «Производственная травма», «Уход за ребёнком < 7 лет», «Уход за ребёнком 7–15 лет»
  - Select (experience): «< 5 лет (60%)», «5–8 лет (80%)», «8+ лет (100%)»

---

### Этап 6 — Wiring в приложение

**Файлы:** `app/AppProviders.tsx`, `App.tsx`

- Добавить `SickLeavesProvider` между `VacationsProvider` и `PaymentsProvider`.
- Новый `CollapsibleSection title="Больничные" icon={Stethoscope}` под «Отпуска».

---

### Этап 7 — Расчётный модуль больничных

**Файл:** `features/payments/model/calculation/sick-leave.ts`

#### Алгоритм `calculateSickLeavePayments(sickLeaves, settings, calendarsByYear, paymentHistory, salaryData)`

```
1. СДЗ = sum(gross/fact всех выплат за 2 предшествующих года) / 730
   - Fallback: currentSalary × 24 / 730 (если данных нет)
   - Clamp: min(МРОТ_СДЗ), max(МАКС_СДЗ)

2. dailyBenefit = СДЗ × experiencePercent(reason, experience)
   - Производственная травма и уход < 7 лет → всегда 100%
   - Уход 7–15 лет: первые 10 дней — по стажу, далее — 50%

3. Разделить дни больничного на части по годам (больничный может переходить через год)

4. Для каждого года:
   a) СФР часть:
      - illness: дни 4+ (первые 3 дня — работодатель)
      - Остальные типы: все дни с 1-го
      
      sfrGross = sum(dailyBenefit за каждый день СФР в этом году)

   b) Работодатель часть (пособие, первые 3 дня):
      - Только для "illness"
      
      employerBenefitDays = min(3, totalCalendarDays)
      employerBenefitGross = employerBenefitDays × dailyBenefit

   c) Доплата от работодателя (если settings.enableTopUp):
      - Осталось ли дней лимита в этом году?
      - topUpDays = min(daysInThisYear, remainingYearLimit)
      
      Для каждого дня с доплатой:
        dailySalary = salaryAtDate / workdaysInMonth
        topUpPerDay = max(0, dailySalary - dailyBenefit)
      
      employerTopUpGross = sum(topUPerDay за topUpDays дней)

5. Сформировать RawEvent(s):
   - employer benefit (дни 1-3 при illness) → type "sick-leave", gross = employerBenefitGross
   - SFR часть → type "sick-leave-sfr", gross = sfrGross
   - доплата → type "sick-leave-topup", gross = employerTopUpGross

6. Дата выплаты: endDate больничного, с переносом на рабочий день (findPreviousWorkday)
```

---

### Этап 8 — Интеграция расчёта в calculateAll()

**Файлы:** `features/payments/model/calculation/types.ts`, `calculation/index.ts`, `shared/types/payment.ts`

- Добавить типы `"sick-leave" | "sick-leave-sfr" | "sick-leave-topup"` в `RawEvent.type` и `Payment.type`.
- `CalculateAllInput`: добавить `sickLeaves: SickLeave[]`, `sickLeaveSettings: SickLeaveSettings`.
- Больничные дни исключить из period gross → объединить с vacationDaysSet в `absenceDaysSet`.
- После генерации salary/advance/surcharge events — вызвать sick leave calculation.
- NDFL обработка:
  - `sick-leave` (employer benefit) → НДФЛ по прогрессивной шкале, участвует в accumulated income.
  - `sick-leave-sfr` → НДФЛ по прогрессивной шкале, НЕ участвует в accumulated income.
  - `sick-leave-topup` → НДФЛ по прогрессивной шкале, участвует в accumulated income.

---

### Этап 9 — PaymentsProvider интеграция

**Файл:** `features/payments/model/PaymentsProvider.tsx`

- Добавить `useSickLeavesProvider()` для получения списка больничных и настроек.
- Передать sickLeaves + settings в calculateAll.

---

### Этап 10 — Цветовая схема календаря

**Файлы:** calendar UI components

- Больничные выплаты — **оранжевый**.
- Дни больничного на календаре — серый (как дни отпуска).

---

### Этап 11 — Import/Export

**Файл:** `features/import-export/model/exportImport.ts`

- Добавить sickLeaves + sickLeaveSettings в сбор и импорт JSON.

---

### Этап 12 — Тесты

**Файлы:** `__tests__/sick-leave*.test.ts`

- **`sick-leave-service.test.ts`** — CRUD, валидация, domain rules.
- **`sick-leave-calculation.test.ts`** — СДЗ, лимиты min/max, % по стажу, типы причин.
- **`sick-leave-topup.test.ts`** — доплата с лимитом дней, перенос лимита между годами.
- **`sick-leave-integration.test.ts`** — вычет из зарплаты (absenceDaysSet), НДФЛ на разные типы платежей.

---

## Риски и уточнения

1. **СДЗ без истории:** если пользователь только начал пользоваться приложением, за 2 года данных не будет. Fallback на `оклад × 24 / 730` — неточно (не учитывает премии). Добавить визуальное предупреждение в UI.

2. **Дата выплаты больничного:** по закону — ближайший день зарплаты после получения информации от СФР. Упрощение: дата = endDate больничного, с переносом на рабочий день.

3. **Пересекающиеся периоды:** если больничный пересекается с отпуском — отпуск приостанавливается при болезни (ТК РФ). Нужно определить приоритет в расчёте.

4. **Лимит дней по уходу за ребёнком:** < 7 лет — 60 дней/год, 7–15 лет — 45 дней/год. Трекинг и предупреждение — на будущее.

5. **Производственная травма** — без лимита базы СФР (реальный доход). Усложняет расчёт СДЗ: нужно брать реальные выплаты без clamp по максимуму.

6. **СДЗ из истории платежей:** берём gross/fact всех выплат кроме отпускных и больничных за 2 предшествующих календарных года. Аналогично логике vacation.ts (IncomeRecord).
