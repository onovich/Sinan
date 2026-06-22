# DiagnosticsAdapter Dev-Only Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-diagnostics-adapter-dev-only-spike`
Base: `origin/codex/mature-dependency-asset-pipeline-adapter-spike`
Status: in progress

## Goal

Implement an isolated dev-only `DiagnosticsAdapter` spike for Sinan mature dependency evaluation.

This spike converts prior Spector.js and Performance API evidence into a Sinan-owned diagnostics boundary. It does not approve production diagnostics integration.

## Scope

Allowed committed paths:

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike/**`

Expected deliverables:

- DiagnosticsAdapter contract and tests
- Performance marker adapter and tests
- unavailable, production-disabled, failed, and disposed fallback states
- Spector dev-only dynamic loader boundary
- browser smoke through DiagnosticsAdapter
- aggregate diagnostics smoke with production exclusion guard
- final dev-only evidence report

## Non-Scope

This spike does not:

- add production diagnostics UI
- add a mainline DiagnosticsSystem
- modify Sinan mainline `src/**`, `data/**`, `tests/**`, or `public/**`
- modify root package manifests, root lockfiles, or root configs
- approve Spector.js as a production dependency
- store capture artifacts in authored JSON, saves, runtime world state, editor store, migrations, event DSL, or timeline data
- implement gameplay, director, timeline, or data behavior that depends on diagnostics
- add persistent capture artifact workflow beyond local-only metadata

## Architecture Boundary

Sinan owns diagnostic capability ids, feature flags, command vocabulary, lifecycle states, normalized messages, artifact metadata, retention policy, and production exclusion policy.

Spector.js owns only optional dev-only WebGL capture internals inside a lazy diagnostics adapter.

The browser Performance API owns timing primitives only. Performance markers in this spike are diagnostics, not gameplay timing or authored data semantics.

## Required Evidence

- `npm --prefix spikes\mature-dependencies run test -- diagnostics-adapter`
- `npm --prefix spikes\mature-dependencies run typecheck`
- `npm --prefix spikes\mature-dependencies run check`
- `npm --prefix spikes\mature-dependencies run smoke:browser`
- `npm --prefix spikes\mature-dependencies run smoke:diagnostics-adapter`
- `git diff --check`

## Production Exclusion

Spector.js must remain disabled by default and dynamically imported only behind dev-only diagnostics policy. Production-disabled and unavailable states must be explicit, non-blocking, and normalized into Sinan-owned messages.

No public contract, report, browser summary, fixture, or docs snapshot may expose Spector-owned objects, WebGL objects, capture handles, or tool-specific state as project truth.

## Future Gate

Any mainline DiagnosticsAdapter or UI integration requires a separate architect-approved implementation guide. This isolated spike is evidence only.
