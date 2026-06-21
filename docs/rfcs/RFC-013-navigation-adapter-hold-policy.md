# RFC-013: Navigation Adapter Hold Policy

Date: 2026-06-21
Status: `hold-for-rfc`
Related matrix row: `NavigationAdapter` / recast-navigation

## Background And Evidence

The mature dependency spike identified recast-navigation and Recast WASM as plausible future navigation candidates. The evidence is insufficient for implementation because navmesh ownership, authoring workflow, WASM packaging, bundle impact, and gameplay semantics are not yet settled.

This RFC intentionally holds navigation adoption. It defines the minimum policy needed to avoid accidental integration.

## Sinan-Owned Contract

Sinan must own before any implementation:

- `NavigationAdapter` interface and navigation query vocabulary.
- Authored navigation intent in level data, if any.
- Generated navmesh artifact ownership and rebuild policy.
- Agent radius, step height, slope, area tags, and layer semantics.
- Fallback behavior for no navigation service.
- Diagnostics for missing navmesh, stale navmesh, unsupported platform, and blocked WASM load.

Until those are defined in a dedicated navigation RFC, navigation remains held.

## Candidate-Owned Responsibilities

recast-navigation may eventually own:

- Recast WASM initialization.
- Navmesh build internals.
- Path query internals.
- Native/WASM memory and disposal.

Those responsibilities are future-only and cannot be exercised in mainline from this hold policy.

## Forbidden Leakage

The following are forbidden:

- No recast or Recast WASM import in mainline.
- No navmesh binary, recast config, or package-specific query result in `data/**/*.json`.
- No runtime AI behavior that assumes recast is available.
- No editor UI that writes recast-specific settings as canonical project semantics.
- No root package or lockfile change for navigation from this RFC.

## Adapter Inputs And Outputs

Future inputs must be Sinan-owned:

- `NavigationConfig` with query policy, agent profiles, diagnostics level, and fallback mode.
- `NavigationBuildRequest` with source geometry ids, profile id, and output artifact policy.
- `NavigationQuery` with start, end, agent profile, allowed areas, and scene snapshot id.

Future outputs must be Sinan-owned:

- `NavigationPathResult` with points, status, cost, and diagnostic metadata.
- `NavigationBuildReport` with artifact paths, warnings, errors, source hashes, and stale markers.
- `NavigationDiagnostic` with missing artifact, stale artifact, unsupported browser, WASM failure, or no-route status.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states remain proposed:

- `held`: no implementation is allowed.
- `unavailable`: no navigation service exists.
- `building`: future navmesh generation is running.
- `ready`: future query service can answer paths.
- `stale`: source geometry changed after artifact generation.
- `disposed`: resources are released.

Fallback:

Until a future RFC changes status, fallback is a static waypoint graph or no navigation service. Gameplay and editor flows must tolerate unavailable navigation.

## Validation Strategy

Before this can leave hold, validation must include:

- Dedicated navigation RFC with data ownership and artifact policy.
- RFC-011 WASM and bundle approval for recast-navigation.
- Browser smoke for dynamic import, WASM load, path query, reload, and fallback failure.
- Fixture-level comparison between authored geometry, generated artifact, and path result.
- Guard proving no recast imports outside a future adapter implementation.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-013 is replaced or amended by a dedicated accepted navigation adapter RFC.
- RFC-011 approves the dependency and WASM policy.
- The compatibility matrix status changes from `hold-for-rfc`.
- A showcase or gameplay acceptance case actually needs navigation.

## Hold, Reject, And Blocker Rules

Hold remains active while navmesh authoring and generated artifact ownership are undefined.
Reject if navigation requires package-specific fields in canonical level JSON.
Block if Recast WASM cannot load under the target browser/bundle policy.
