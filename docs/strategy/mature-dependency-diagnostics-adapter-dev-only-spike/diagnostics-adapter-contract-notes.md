# DiagnosticsAdapter Contract Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-diagnostics-adapter-dev-only-spike`

## Contract Boundary

The isolated spike defines a Sinan-owned `DiagnosticsAdapter` contract in `spikes/mature-dependencies/src/diagnostics-adapter/diagnostics-adapter-types.ts`.

Public values are limited to:

- diagnostic capability ids
- feature flags and production exclusion policy
- command vocabulary
- lifecycle statuses
- normalized messages
- performance metrics
- local-only artifact metadata
- cleanup and retention policy

The public contract does not expose tool-owned objects, browser rendering objects, capture handles, or dependency object models.

## Implemented Paths

- `PerformanceDiagnosticsAdapter`: wraps Performance API markers and normalizes marker metrics, unsupported API behavior, invalid marker names, cleanup, failed commands, and disposal.
- `SpectorDiagnosticsAdapter`: owns dev-only frame capture command states while staying disabled by default.
- `spector-dev-only-loader.ts`: isolated dynamic import holder for the dev-only diagnostics package.
- `diagnostics-adapter-browser-smoke.ts`: browser smoke path proving the adapter boundary.

## Current Validation

- `npm --prefix spikes\mature-dependencies run check`: PASS.
- `npm --prefix spikes\mature-dependencies run smoke:browser`: PASS.
- `npm --prefix spikes\mature-dependencies run smoke:diagnostics-adapter`: PASS.

## Mainline Gate

This spike does not approve production diagnostics UI, a mainline DiagnosticsSystem, persistent capture workflows, or gameplay/data/timeline behavior that depends on diagnostics.
