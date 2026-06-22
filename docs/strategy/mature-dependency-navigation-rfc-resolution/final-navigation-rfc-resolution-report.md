# Mature Dependency NavigationAdapter RFC Resolution Final Report

Date: 2026-06-22
Branch: `codex/mature-dependency-navigation-rfc-resolution`
Base: `origin/codex/mature-dependency-diagnostics-adapter-dev-only-spike` / `fb4307f21a30a55cc977c5d9cfae97b64aebc168`
Final commit: this report commit; final pushed HEAD is recorded in the executor handoff
Status: PASS

## Goal

Resolve the remaining NavigationAdapter planning gap without implementation.

The goal was to turn the prior `hold-for-rfc` status into a clear architect-reviewable decision packet covering source-of-truth, generated artifact policy, fallback strategy, browser/WASM/bundle gates, and future implementation conditions.

## Scope

Committed changes are docs-only and limited to:

- `docs/strategy/mature-dependency-navigation-rfc-resolution/**`
- `docs/rfcs/RFC-014-navigation-adapter-boundary-proposal.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/README.md`

No runtime code, package manifests, lockfiles, root configs, browser smoke implementation, generated reports, mainline `src/**`, `data/**`, `tests/**`, `public/**`, `.codex/**`, `Role.md`, or Phase 20/21/22/23/24/25 files were committed.

## Decision

NavigationAdapter moves from `hold-for-rfc` to `hold-for-showcase`.

The RFC gap is resolved because RFC-014 defines a package-agnostic NavigationAdapter boundary. Implementation remains blocked because no concrete playable/editor showcase acceptance case has been approved, and browser/WASM/bundle gates are not yet satisfied.

## Documents Created Or Updated

- `docs/strategy/mature-dependency-navigation-rfc-resolution/README.md`
- `docs/strategy/mature-dependency-navigation-rfc-resolution/navigation-decision-record.md`
- `docs/strategy/mature-dependency-navigation-rfc-resolution/navigation-source-of-truth-and-artifact-policy.md`
- `docs/strategy/mature-dependency-navigation-rfc-resolution/navigation-fallback-and-showcase-gate.md`
- `docs/strategy/mature-dependency-navigation-rfc-resolution/navigation-evidence-matrix.md`
- `docs/strategy/mature-dependency-navigation-rfc-resolution/final-navigation-rfc-resolution-report.md`
- `docs/rfcs/RFC-014-navigation-adapter-boundary-proposal.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/README.md`

## Matrix Outcome

`NavigationAdapter` is now recorded as `hold-for-showcase`.

Meaning:

- the Sinan-owned boundary is defined for architect review;
- implementation is not approved;
- future work must begin with a named showcase/gameplay acceptance case;
- RFC-011 dependency, bundle, WASM, browser smoke, and artifact gates must pass before code changes.

## Navigation Source-Of-Truth Policy

Future canonical data may own only Sinan-authored navigation intent:

- navigation region ids;
- source geometry references;
- agent profile ids;
- area semantics;
- layer/zone ids;
- fallback preferences;
- validation expectations.

Canonical data must not contain Recast objects, WASM handles, Detour query objects, binary navmesh blobs, candidate package version semantics, package-specific bitmasks, dependency path results, browser chunk paths, or WASM asset paths.

## Generated Artifact Policy

Generated navmesh artifacts are rebuildable output. They may carry provenance and staleness metadata, but they are not authored truth.

Future artifact states must include missing, stale, incompatible, deleted, and blocked outcomes. Deleting generated artifacts must not be authored data loss.

## Fallback And Showcase Gate

Fallback remains first-class:

- no navigation service;
- static waypoint graph;
- grid or approximate fallback;
- straight-line editor preview;
- future navmesh adapter only after gates pass.

A future implementation spike requires a concrete showcase or gameplay acceptance case that names target scene, actor type, navigation behavior, fallback behavior, observable acceptance check, canonical source data, and rebuildable generated artifacts.

## Browser/WASM/Bundle Gates

Future navigation implementation requires:

- RFC-011 dependency approval;
- license and distribution note;
- measured initial JS, lazy chunk, and WASM asset sizes;
- bundle budget thresholds;
- dynamic import/code splitting design;
- browser smoke for dynamic import, WASM load, query, reload/cache, fallback failure, and disposal;
- import guard proving dependency containment;
- generated artifact guard and exit strategy.

## Validation Commands

```powershell
git diff --check
git status --short --branch
git diff --name-only origin/codex/mature-dependency-diagnostics-adapter-dev-only-spike...HEAD
rg -n "NavigationAdapter|RFC-014|hold-for-rfc|hold-for-showcase|not authorized|future gate|PASS" docs\strategy\mature-dependency-navigation-rfc-resolution docs\strategy\mature-dependency-contracts docs\rfcs
```

Final validation result:

- `git diff --check`: PASS with LF/CRLF warnings only from existing generated JSON traces and touched docs.
- `git status --short --branch`: branch tracked the pushed navigation branch; only known local dirt remained outside committed scope.
- committed scope from `origin/codex/mature-dependency-diagnostics-adapter-dev-only-spike...HEAD`: PASS, allowed docs paths only.
- `rg` validation: PASS, required decision, RFC, status, gate, and not-authorized terms present.

## Architecture Notes

Sinan owns navigation intent, source geometry references, agent profiles, area semantics, query vocabulary, fallback policy, diagnostics, generated artifact policy, and the future adapter contract.

Candidate packages may own navmesh generation internals, path query internals, WASM memory, disposal, and package-specific optimization details only behind the adapter boundary.

## Risks And Known Limits

- No navigation package has been selected for implementation.
- recast-navigation remains candidate evidence only.
- No browser navigation smoke exists in this goal; prior navigation browser status remains policy skip.
- No showcase/gameplay acceptance case has been approved.
- Historical contract-pack final report still records the older `hold-for-rfc` state; current status is in the matrix, RFC-013 update note, RFC-014, and this report.

## Future Implementation Gate

Future implementation may proceed only after:

- architect accepts RFC-014 or a successor;
- a concrete showcase/gameplay acceptance case exists;
- RFC-011 dependency and bundle approval is complete;
- browser/WASM smoke commands are named and passing;
- generated artifact policy is enforced;
- a separate implementation guide explicitly authorizes any package/config/code paths.

## Not Authorized

This branch does not authorize:

- `recast-navigation` import or install;
- root package, lockfile, or config changes;
- runtime `NavigationAdapter` or `NavigationSystem`;
- navigation browser smoke implementation;
- authored `data/**/*.json` navigation changes;
- generated navmesh artifacts as source truth;
- mainline integration.
