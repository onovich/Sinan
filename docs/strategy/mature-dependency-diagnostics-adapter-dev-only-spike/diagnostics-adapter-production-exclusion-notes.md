# DiagnosticsAdapter Production Exclusion Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-diagnostics-adapter-dev-only-spike`

## Policy

Diagnostics are development-only evidence in this spike. They are not gameplay, authored data, timeline, migration, runtime world, or production editor semantics.

The dev-only frame capture dependency is:

- disabled by default
- unavailable when feature flags are off
- production-disabled outside dev behavior
- dynamically imported only from `spector-dev-only-loader.ts`
- excluded from browser-entry production behavior

## Guard

`smoke:diagnostics-adapter` fails if:

- a static `spectorjs` import appears
- dynamic import appears outside the dev-only loader or legacy evidence smoke
- dynamic code execution appears
- public DiagnosticsAdapter contracts leak tool-owned terms
- production `dist/**` contains `spectorjs` or `SPECTOR`
- `test-results`, `playwright-report`, `coverage`, `dist`, or diagnostics capture artifacts remain after cleanup

## Artifact Policy

Committed:

- small JSON summaries
- source tests
- Markdown evidence

Not committed:

- browser traces
- screenshots or videos
- `dist/**`
- `coverage/**`
- `test-results/**`
- `playwright-report/**`
- diagnostics capture artifacts

## Future Gate

Production diagnostics work requires a separate implementation guide and production exclusion review before any mainline package, UI, runtime, or data change.
