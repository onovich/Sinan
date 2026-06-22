# PhysicsAdapter Evidence Matrix

Date: 2026-06-22
Branch: `codex/mature-dependency-physics-adapter-spike`

| Requirement | Evidence | Result |
| --- | --- | --- |
| Isolated spike only | Changes are limited to `spikes/mature-dependencies/**` and `docs/strategy/mature-dependency-physics-adapter-spike/**`. | PASS |
| Sinan contract types | `spikes/mature-dependencies/src/physics-adapter/physics-adapter-types.ts` and tests. | PASS |
| Body/collider normalization | `physics-spec-normalizer.ts` validates ids, shapes, mass intent, layers, masks, duplicate ids, and missing bodies. | PASS |
| Dependency-free fallback | `fake-physics-adapter.ts` provides deterministic fallback, fixed-step sequencing, diagnostics, snapshots, and disposal. | PASS |
| Rapier lifecycle and WASM init | `rapier-physics-adapter.ts` boots `@dimforge/rapier3d-compat`, creates worlds, and records stable statuses. | PASS |
| Internal handle ownership | Adapter maps Sinan ids to internal handles; public snapshots use Sinan ids only. | PASS |
| Fixed-step policy | Rapier and fake adapters apply Sinan `stepMs`, accumulator, and max catch-up clamp diagnostics. | PASS |
| Body/collider step snapshots | Rapier world step returns body transforms and velocity snapshots. | PASS |
| Collision and trigger events | Rapier collision handles are normalized to Sinan `collision-*` and `trigger-*` events. | PASS |
| Raycast and overlap queries | Rapier query results are mapped to Sinan `PhysicsQueryHit` values; misses return `query-miss`. | PASS |
| Browser smoke through adapter | `src/browser-smoke/physics-adapter.pw.ts` calls the browser catalog `physicsAdapter` entry. | PASS |
| Aggregate smoke | `npm --prefix spikes\mature-dependencies run smoke:physics-adapter` validates typecheck, unit tests, boundary guard, browser summary, cleanup, and artifact guard. | PASS |
| Artifact cleanup | Aggregate smoke removes `test-results` and `playwright-report` before the guard. | PASS |
| Bundle/WASM risk recorded | `physics-adapter-bundle-policy-notes.md` records compat package choice, base package risk, bundle impact, and fallback strategy. | PASS |
| Mainline integration gate | Final adoption remains blocked until a separate mainline architecture and production gate. | NOT APPROVED |

## Validation Commands

Most recent evidence set:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:physics-adapter
git diff --check
```

Recorded results:

- `check`: PASS, 24 test files / 93 tests, build PASS with existing large chunk warning.
- `smoke:browser`: PASS, 11 Playwright tests.
- `smoke:physics-adapter`: PASS.
- `git diff --check`: PASS with LF/CRLF warnings only.
