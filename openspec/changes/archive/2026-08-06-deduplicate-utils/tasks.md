# Tasks: Deduplicate Utility Functions

## 1. Add shared function

- [x] 1.1 Add `localDateToCalendarKey(ld: LocalDate): string` to `shared/lib/utils.ts` — formats as `"YYYYMMDD"`

## 2. Replace local functions in calendar feature

- [x] 2.1 In `features/calendar/model/calendar.ts`: remove local `formatDate`, import and use `localDateToCalendarKey` from `@/shared/lib/utils`
- [x] 2.2 In `features/calendar/model/isdayoff-fetch.ts`: remove local `formatDate`, import and use `localDateToCalendarKey` from `@/shared/lib/utils`

## 3. Remove dead code

- [x] 3.1 Remove `formatDateKey` function from `shared/types/local-date.ts`
- [x] 3.2 Remove `formatDateKey` export from `shared/types/index.ts`

## 4. Verify

- [x] 4.1 Run `pnpm lint` — no errors
- [x] 4.2 Run `pnpm test:run` — all tests pass