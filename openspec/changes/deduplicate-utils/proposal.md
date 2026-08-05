# Deduplicate Utility Functions

## Why

The codebase contains duplicate utility functions for date formatting scattered across multiple files — three copies of `formatDate(LocalDate → "YYYYMMDD")` and two near-identical key-formatting functions (`dateToKey`, `formatDateKey`). This creates maintenance overhead: a fix or improvement must be applied in every copy, increasing the risk of inconsistency.

## What Changes

- Extract a single `localDateToCalendarKey(ld)` function to `shared/lib/` that formats `LocalDate` as `"YYYYMMDD"` (used by CalendarData keys)
- Remove the local `formatDate` functions from `features/calendar/model/calendar.ts` and `features/calendar/model/isdayoff-fetch.ts`
- Evaluate `dateToKey()` in `shared/lib/utils.ts` and `formatDateKey()` in `shared/types/local-date.ts` — both produce `"YYYY-MM-DD"` via `ld.toString()`. Keep one, remove the other.

## Capabilities

### New Capabilities
None — this is a pure refactor with no behavioral changes.

### Modified Capabilities
None — no spec-level behavior changes. The change sets `skip_specs: true` because it does not alter externally observable system behavior.

## Impact

- **Affected files**:
  - `shared/lib/utils.ts` — add `localDateToCalendarKey`, potentially remove `dateToKey`
  - `features/calendar/model/calendar.ts` — replace local `formatDate` with shared import
  - `features/calendar/model/isdayoff-fetch.ts` — replace local `formatDate` with shared import
  - `shared/types/local-date.ts` — evaluate `formatDateKey` for removal
- **No API changes**, no behavioral changes, no test impact (the functions produce identical output)
