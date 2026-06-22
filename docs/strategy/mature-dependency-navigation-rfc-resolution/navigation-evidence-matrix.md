# NavigationAdapter RFC Resolution Evidence Matrix

Date: 2026-06-22
Branch: `codex/mature-dependency-navigation-rfc-resolution`
Decision: `hold-for-showcase`

## Evidence Matrix

| Requirement | Evidence | Result |
| --- | --- | --- |
| Prior hold policy understood | RFC-013 records unresolved navmesh ownership, authoring workflow, WASM packaging, bundle impact, and gameplay semantics. | PASS |
| Candidate value understood | `recast-navigation-evaluation.md` records isolated Node/Vitest/Vite evidence. | PASS |
| Browser policy understood | Browser smoke harness records navigation as `POLICY-SKIP` under RFC-013. | PASS |
| Source-of-truth policy | `navigation-source-of-truth-and-artifact-policy.md` defines authored navigation intent and forbids package-owned canonical content. | PASS |
| Generated artifact policy | Generated navmesh artifacts are rebuildable output with provenance, staleness, cleanup, and exit rules. | PASS |
| Contract proposal | RFC-014 defines `NavigationConfig`, `NavigationBuildRequest`, `NavigationQuery`, `NavigationPathResult`, `NavigationBuildReport`, and `NavigationDiagnostic`. | PASS |
| Fallback behavior | `navigation-fallback-and-showcase-gate.md` defines unavailable, waypoint, grid, straight-line preview, and future navmesh options. | PASS |
| Browser/WASM/bundle gates | RFC-014 and showcase gate require RFC-011 approval, browser smoke, bundle budget, import guard, and generated artifact guard before implementation. | PASS |
| Matrix status | Compatibility matrix moves NavigationAdapter from `hold-for-rfc` to `hold-for-showcase`. | PASS |
| Implementation approval | This goal does not approve implementation. | NOT APPROVED |

## Decision Rationale

`hold-for-rfc` can be closed because RFC-014 now defines a package-agnostic NavigationAdapter boundary and artifact/fallback policies.

`adapter-spike-ready` is not appropriate because navigation still lacks:

- concrete showcase or gameplay acceptance case;
- browser/WASM smoke for a future adapter;
- dependency approval record under RFC-011;
- accepted bundle budgets for recast-navigation or any alternative;
- final package candidate choice.

## Matrix Outcome

`hold-for-showcase` means:

- NavigationAdapter has a proposed boundary.
- Implementation remains blocked.
- Future work must start from an accepted showcase/gameplay need, then validate browser/WASM/bundle gates before code changes.

## Not Authorized

- recast-navigation import or install;
- root package or config changes;
- runtime NavigationSystem implementation;
- browser smoke implementation for navigation in this goal;
- generated navmesh as canonical source truth.
