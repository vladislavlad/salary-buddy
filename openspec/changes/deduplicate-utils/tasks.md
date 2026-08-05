# Tasks: Deduplicate Utility Functions

## 1. Add shared function

- [ ] 1.1 Add `localDateToCalendarKey(ld: LocalDate): string` to `shared/lib/utils.ts` — formats as `"YYYYMMDD"`

## 2. Replace local functions in calendar feature

- [ ] 2.1 In `features/calendar/model/calendar.ts`: remove local `formatDate`, import and use `localDateToCalendarKey` from `@/shared/lib/utils`
- [ ] 2.2 In `features/calendar/model/isdayoff-fetch.ts`: remove local `formatDate`, import and use `localDateToCalendarKey` from `@/shared/lib/utils`

## 3. Remove dead code

- [ ] 3.1 Remove `formatDateKey` function from `shared/types/local-date.ts`
- [ ] 3.2 Remove `formatDateKey` export from `shared/types/index.ts`

## 4. Verify

- [ ] 4.1 Run `pnpm lint` — no errors
- [ ] 4.2 Run `pnpm test:run` — all tests pass