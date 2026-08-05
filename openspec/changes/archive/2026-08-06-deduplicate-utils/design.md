# Design: Deduplicate Utility Functions

## Context

Three copies of date-formatting logic exist:
- `calendar.ts` and `isdayoff-fetch.ts` each define a local `formatDate(ld)` → `"YYYYMMDD"`
- `shared/types/local-date.ts` exports `formatDateKey()` → `"YYYY-MM-DD"` (never imported anywhere — dead code)
- `shared/lib/utils.ts` exports `dateToKey()` → `"YYYY-MM-DD"` (used in 14+ places across the codebase)

## Goals / Non-Goals

**Goals:**
- Single source of truth for `LocalDate → "YYYYMMDD"` formatting (CalendarData keys)
- Remove dead code (`formatDateKey`)
- No behavioral changes — all functions produce identical output

**Non-Goals:**
- Restructuring the shared module layout beyond these specific files
- Renaming `dateToKey` (it is widely used and well-named for its purpose)

## Decisions

### 1. Add `localDateToCalendarKey(ld)` to `shared/lib/utils.ts`

The CalendarData key format (`"YYYYMMDD"`) is distinct from ISO date strings (`"YYYY-MM-DD"`). A dedicated function name makes the intent clear and avoids confusion with `dateToKey`.

Placed in `utils.ts` alongside `dateToKey`, since both are formatting utilities used across features. The calendar feature already imports from this module.

### 2. Remove local `formatDate` from `calendar.ts` and `isdayoff-fetch.ts`

Both files import from `shared/lib/utils.ts` or could easily do so. Replacing the local function with an import of `localDateToCalendarKey` eliminates duplication without changing behavior.

### 3. Remove `formatDateKey` from `shared/types/local-date.ts`

The function is exported but never imported anywhere in the codebase — it is dead code. Removing it reduces surface area and avoids confusion with `dateToKey` (which does the same thing).

## Risks / Trade-offs

- **Import path change**: `isdayoff-fetch.ts` currently has no import from `shared/lib/utils`. Adding one introduces a new dependency, but this is benign — it's a shared utility module.
- **No risk of behavioral regression** since all functions produce identical output for the same input. The change is mechanically verifiable by running tests.