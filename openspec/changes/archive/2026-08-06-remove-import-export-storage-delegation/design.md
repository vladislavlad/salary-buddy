# Design: Remove import-export storage delegation

## Context

Текущая структура:
```
ImportExportPanel → exportImport.ts → storage.ts → app/repositories.ts
```

`storage.ts` — 102 строки, каждая функция делегирует один вызов репозиторию. Фича зависит от `app/` через конкретные экземпляры.

## Goals / Non-Goals

**Goals:**
- Удалить `storage.ts`, сократить путь зависимостей на один уровень
- Направить зависимости: фича → абстракции (Repository<T>), app → связывание конкретных экземпляров
- Внешнее поведение export/import не меняется

**Non-Goals:**
- Не менять формат экспортируемого JSON
- Не менять UI import-export панели
- Не вводить provider/context для репозиториев

## Decisions

### 1. Репозитории передаются как параметры функций модели

`collectExportData()` и `importFromFile()` принимают объект с репозиториями:

```typescript
interface ExportImportRepositories {
  salary: Repository<Salary>;
  bonus: Repository<Bonus>;
  vacation: Repository<Vacation>;
  surcharge: Repository<SurchargeChange>;
  payment: Repository<Payment>;
  sickLeave: Repository<SickLeave>;
  salaryPaymentSettings: SalaryPaymentSettingsRepository;
  sickLeaveSettings: SickLeaveSettingsRepository;
}

export async function collectExportData(repos: ExportImportRepositories): Promise<...>
export async function importFromFile(file: File, repos: ExportImportRepositories): Promise<void>
export async function clearAll(repos: ExportImportRepositories): Promise<void>
```

**Альтернативы рассмотрены:**
- **Service class с конструктором** — добавляет индирекцию без пользы; функции export/import вызываются однократно, не требуют stateful service
- **Context/Provider для репозиториев** — оверхед: один компонент использует репозитории, нет необходимости в реактивности

### 2. ImportExportPanel получает репозитории из app/repositories.ts напрямую

UI-компонент импортирует конкретные экземпляры из `app/repositories` и передаёт их в функции модели:

```typescript
// ImportExportPanel.tsx
import { bonusRepository, salaryRepository, ... } from "@/app/repositories";

const repos: ExportImportRepositories = {
  salary: salaryRepository,
  bonus: bonusRepository,
  // ...
};

await collectExportData(repos);
```

Это допустимо: UI-компонент — конечный потребитель, он имеет право знать о конкретных экземплярах. Зависимость направлена правильно: `app/` создаёт экземпляры → фича принимает абстракции.

### 3. Тип репозиториев в ExportImportRepositories — конкретные интерфейсы

Для salaryPaymentSettings и sickLeaveSettings используются их собственные интерфейсы (не общий Repository<T>), так как они имеют `get()`/`save()` вместо `findAll()`/`saveAll()`.

## Risks / Trade-offs

- **Риск**: ImportExportPanel знает о конкретных экземплярах из app/repositories — та же зависимость, что была через storage.ts, но теперь явная. → Это не проблема: UI-компонент — leaf в дереве зависимостей, он имеет право знать о конкретных реализациях. Проблема была в том, что модельный слой (storage.ts) зависел от app/.

## Migration Plan

1. Определить `ExportImportRepositories` в `exportImport.ts`
2. Изменить сигнатуры `collectExportData`, `importFromFile`, `clearAll` — добавить параметр repos
3. Обновить ImportExportPanel: собрать объект repos из app/repositories, передать в функции
4. Удалить `storage.ts`
5. Запустить lint и тесты
