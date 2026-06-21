# RFC-011: WASM Bundle Dependency Policy

Date: 2026-06-21
Status: `accept-for-contract`
Related matrix rows: Rapier, meshoptimizer, recast-navigation, and any future WASM/native dependency

## Background And Evidence

The mature dependency spike proved that some candidate packages are useful only if their WASM or native packaging behavior can be made explicit. Rapier, meshoptimizer, and recast-style navigation are not just API choices; they affect bundle size, asset paths, license review, local browser smoke, and production loading behavior.

This policy separates spike dependency evidence from mainline dependency approval. A dependency being useful in `spikes/**` does not approve changes to the root package manifest or lockfile.

## Sinan-Owned Contract

Sinan owns:

- Dependency approval records for package name, version range, license, runtime target, and owner.
- Root package and lockfile change approval through a future implementation guide.
- Bundle budget thresholds for initial JS, lazy chunks, WASM assets, worker chunks, and dev-only chunks.
- WASM asset path policy, cache policy, preload policy, and fallback behavior.
- Dynamic import and code split policy for optional runtime, editor-only, and dev-only candidates.
- Browser support matrix and smoke requirements.
- Exit policy for removing a dependency without changing authored `data/**/*.json`.

The policy applies to runtime dependencies, editor dependencies, worker dependencies, offline pipeline dependencies, and dev-only diagnostic dependencies.

## Candidate-Owned Responsibilities

Candidate packages may own:

- Their internal WASM/native initialization.
- Internal binary asset layout.
- Package-specific lazy initialization hooks.
- Low-level performance characteristics.
- Tool-specific license and distribution notices before Sinan normalizes them into an approval record.

Candidate packages cannot decide where Sinan stores assets, how Sinan names chunks, or whether a root dependency change is approved.

## Forbidden Leakage

The following are forbidden:

- No root `package.json`, lockfile, bundler config, or dependency manifest change from a contract RFC alone.
- No WASM path, package version, dynamic import path, or chunk name in authored JSON DSL.
- No direct dependency import from modules outside the approved adapter or tool boundary.
- No production import of `dev-only` packages.
- No spike dependency treated as a transitive approval for mainline.

## Adapter Inputs And Outputs

Inputs:

- `DependencyApprovalRequest` with package, version, license, target, owner, adapter RFC, runtime/editor/offline/dev-only classification, and expected bundle impact.
- `BundleBudgetPolicy` with max initial JS, max lazy chunk, max WASM asset, max worker chunk, and warning thresholds.
- `WasmAssetPolicy` with load path, cache policy, preload policy, integrity/checksum if needed, and fallback state.

Outputs:

- `DependencyApprovalRecord` with approved, held, rejected, blocked, or dev-only status.
- `BundleImpactReport` with measured initial chunk, lazy chunk, WASM asset, worker chunk, and before/after deltas.
- `DependencyDiagnostic` with unsupported browser, failed dynamic import, missing WASM asset, license blocker, budget failure, or production exclusion failure.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `unrequested`: no dependency approval exists.
- `approved-for-spike`: isolated spike may use the package.
- `approved-for-mainline`: implementation guide approved root package changes.
- `dev-only`: package must be absent from production runtime behavior.
- `held`: another RFC or browser smoke is required.
- `blocked`: license, packaging, or browser support prevents adoption.
- `removed`: dependency was intentionally exited.

Errors:

- Dynamic import failed.
- WASM asset missing or served with the wrong type.
- Lazy chunk exceeded budget.
- Initial bundle grew beyond threshold.
- License or native distribution review failed.
- Production build includes a dev-only package.

Fallback:

Every WASM or optional dependency must declare a fallback state before adoption. Fallback may be a null adapter, raw asset pass-through, main-thread task runner, diagnostics unavailable state, or an explicit blocked status.

## Validation Strategy

Before implementation can enter mainline, validation must include:

- Dependency approval record linked to the relevant adapter RFC.
- Bundle report for initial JS, lazy chunks, WASM assets, worker chunks, and production build exclusion.
- Browser smoke for dynamic import, reload, cache behavior, fallback, and failed asset path where applicable.
- License and distribution note for each package.
- `rg` import guard proving the dependency only appears in approved adapter/tool/dev-only paths.
- Exit rehearsal or documented removal path.

## Future Implementation Gate

Future implementation may proceed only when:

- The adapter-specific RFC is accepted.
- RFC-011 approval record marks the dependency as `approved-for-mainline`, `dev-only`, or explicitly held with no code change.
- Bundle budget and browser smoke pass.
- The implementation guide lists exact package/lock/config files to change.
- The compatibility matrix is updated if the package status changes.

## Hold, Reject, And Blocker Rules

Hold if:

- Bundle impact is unknown.
- Dynamic import or code split design is undefined.
- Browser smoke cannot verify WASM asset loading.
- License review is incomplete.

Reject if:

- A package requires authored data to contain package-specific paths or version data.
- A dev-only package cannot be excluded from production behavior.

Block if:

- The package cannot load in the target browser.
- Root package changes are required but no implementation guide exists.
- WASM/native assets cannot be distributed under project constraints.
