# Tasks: Remove import-export storage delegation

## 1. Определить тип репозиториев и изменить сигнатуры функций модели

- [x] 1.1 Добавить интерфейс `ExportImportRepositories` в `features/import-export/model/exportImport.ts` с полями для всех 8 репозиториев (salary, bonus, vacation, surcharge, payment, sickLeave — общий Repository<T>; salaryPaymentSettings и sickLeaveSettings — собственные интерфейсы)
- [x] 1.2 Изменить сигнатуру `collectExportData()` → `collectExportData(repos: ExportImportRepositories)`
- [x] 1.3 Изменить сигнатуру `importFromFile(file, repos)` → добавить параметр repos
- [x] 1.4 Добавить функцию `clearAll(repos: ExportImportRepositories)` в exportImport.ts (перенести из storage.ts)
- [x] 1.5 Обновить тела функций: заменить вызовы через storage на прямые вызовы репозиториев из repos

## 2. Обновить ImportExportPanel

- [x] 2.1 Импортировать конкретные экземпляры репозиториев из `app/repositories`
- [x] 2.2 Создать объект `repos: ExportImportRepositories` внутри компонента
- [x] 2.3 Передать repos в вызовы `collectExportData(repos)`, `importFromFile(file, repos)`, `clearAll(repos)`
- [x] 2.4 Удалить импорт `clearAll` из storage.ts (теперь из exportImport)

## 3. Удалить storage.ts и проверить сборку

- [x] 3.1 Удалить файл `features/import-export/model/storage.ts`
- [x] 3.2 Запустить `pnpm lint` — убедиться, что нет линтерных ошибок
- [x] 3.3 Запустить `pnpm build` — убедиться, что сборка проходит без ошибок (2 ошибки в calculation/index.ts — pre-existing на main)
