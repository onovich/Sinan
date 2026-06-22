# NavigationAdapter RFC Resolution

Date: 2026-06-22
Branch: `codex/mature-dependency-navigation-rfc-resolution`
Status: docs-only RFC resolution packet

## Scope

This packet resolves the remaining `NavigationAdapter` planning gap after the accepted mature dependency adapter spikes. It converts the current `hold-for-rfc` row into an architect-reviewable navigation decision without implementing navigation.

Allowed work:

- define Sinan-owned navigation source-of-truth and generated artifact policy;
- draft a package-agnostic NavigationAdapter boundary proposal;
- define fallback behavior and future showcase gates;
- reconcile the compatibility matrix and contract index;
- record validation and final decision evidence.

## Non-Scope

This packet does not:

- implement `NavigationAdapter` or `NavigationSystem`;
- import or install `recast-navigation`;
- add runtime, browser smoke, source, data, test, public asset, or package/config changes;
- approve generated navmesh blobs as canonical source truth;
- start an implementation spike.

## Required Reading

- `AGENTS.md`
- `docs/strategy/mature-dependency-diagnostics-adapter-dev-only-spike-repair-acceptance-2026-06-22.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/browser-smoke-environment-policy.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md`
- `docs/strategy/mature-dependency-spikes/recast-navigation-evaluation.md`
- `docs/strategy/mature-dependency-spikes/final-readiness-report.md`
- `docs/strategy/mature-dependency-browser-smoke/final-browser-smoke-harness-report.md`

## Allowed Committed Paths

- `docs/strategy/mature-dependency-navigation-rfc-resolution/**`
- `docs/rfcs/RFC-014-navigation-adapter-boundary-proposal.md`
- `docs/rfcs/RFC-013-navigation-adapter-hold-policy.md` for a short cross-reference only
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/README.md`

## Forbidden Committed Paths

- `spikes/mature-dependencies/package.json`
- `spikes/mature-dependencies/package-lock.json`
- `spikes/mature-dependencies/src/**`
- `spikes/mature-dependencies/reports/**`
- root package/config files
- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `.codex/**`
- `Role.md`
- Phase 20/21/22/23/24/25 files

## Possible Outcomes

`hold-for-rfc` remains correct if the packet cannot define a complete package-agnostic navigation boundary.

`hold-for-showcase` is the conservative target if RFC-014 defines enough boundary policy but navigation still lacks a concrete showcase or gameplay acceptance case.

`adapter-spike-ready` is not expected for this goal. It would require completed data ownership, artifact, WASM, browser, bundle, and showcase gates, and a separate architect approval before any implementation work.

## Validation

Round-level validation uses targeted `Test-Path`, `rg`, `git diff --check`, branch status checks, and explicit committed-scope checks. This docs-only goal should not run package install, package upgrade, or navigation browser smoke implementation.
