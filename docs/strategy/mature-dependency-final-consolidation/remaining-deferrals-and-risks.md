# Remaining Deferrals And Risks

Date: 2026-06-22
Status: final consolidation risk register

## Summary

The mature-dependency lane is evidence-complete for the accepted scope, but it intentionally leaves mainline adoption deferred. The risks below should be converted into future implementation gates, not treated as reasons to bypass the boundary.

## Deferrals

| Area | Deferral | Reason | Required future action |
| --- | --- | --- | --- |
| Mainline dependency adoption | No mature dependency is approved for Sinan root package or production runtime. | Isolated evidence is not the same as mainline architecture approval. | Write one adapter-specific implementation guide with package/config scope. |
| Phase 20/21 integration | No mature-dependency task is merged into current mainline phase execution. | Mainline phase guides own their own paths and validation. | Deputy architect must schedule separate work only after phase gates allow it. |
| Navigation | Navigation remains `hold-for-showcase`. | Boundary exists, but there is no named showcase/gameplay acceptance case. | Define showcase, accept RFC-014, then run browser/WASM/bundle gates. |
| Diagnostics | Diagnostics remains `dev-only`. | Spector.js and captures are debugging capabilities, not game/editor semantics. | Prove production exclusion before any UI toggle appears. |
| Generated assets | Generated GLB/navmesh/capture artifacts are not source of truth. | Authored data and source assets must remain stable and reviewable. | Future guides must define generated roots, cleanup, diffs, and guard checks. |
| Browser behavior | Browser-sensitive behavior is not assumed from Node-only tests. | Autoplay, IndexedDB, workers, WASM, and captures can fail differently in browsers. | Keep browser smoke mandatory for relevant adapters. |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Evidence is mistaken for adoption approval. | Mainline could gain dependencies without explicit architecture review. | Keep final report and decision table language tied to future guide requirements. |
| Package/config edits are under-scoped. | Dependency adoption could affect build, bundle, and CI behavior outside the adapter. | Require explicit package/config authorization and scope scan in every future guide. |
| WASM/browser dependencies fail only in production-like browser conditions. | Runtime features may pass unit tests but fail load, disposal, or bundle constraints. | Require real browser smoke and artifact cleanup for WASM/browser candidates. |
| Generated artifacts become canonical. | Authored JSON/source asset model could drift or become hard to review. | Record generated outputs as derived, cleanable, and reproducible. |
| Fallback behavior is shallow. | Users may see silent feature loss or non-deterministic behavior. | Require visible diagnostics and deterministic fallback in adapter contracts. |
| Dev-only diagnostics leak into production. | Bundle size, privacy, or runtime behavior could be compromised. | Require dynamic import and production exclusion proof before any diagnostics UI ships. |
| Navigation implementation is started too early. | A complex WASM/pathfinding dependency could be chosen without gameplay proof. | Keep `NavigationAdapter` on `hold-for-showcase` until a named acceptance case exists. |

## Exit Strategy

If any future mature-dependency implementation fails validation, the exit path should preserve authored data and remove only the adapter binding, generated artifacts, package/config changes, and implementation files introduced by that guide.

The fallback should keep Sinan functional with a visible diagnostic rather than partial dependency behavior.
