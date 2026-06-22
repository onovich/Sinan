# RFC-014: Navigation Adapter Boundary Proposal

Date: 2026-06-22
Status: proposed; docs-only; implementation not authorized
Related matrix row: `NavigationAdapter`
Supersedes: none yet; may supersede RFC-013 only after architect acceptance

## Background And Evidence

RFC-013 holds NavigationAdapter implementation because navigation source data, generated navmesh artifacts, fallback behavior, WASM/browser validation, and gameplay need were unresolved.

The isolated recast-navigation evaluation proved candidate value, but not production readiness:

- Node import and WASM init passed in the spike package.
- A minimal navmesh/query fixture passed after tuning.
- Vite production build emitted a large `recast-navigation.wasm-compat` chunk.
- Browser smoke remained skipped by policy under RFC-013.
- The candidate still needs RFC-011 dependency, bundle, and browser validation.

This RFC defines a Sinan-owned boundary so future review can reason about NavigationAdapter without adopting recast-navigation or any other package.

## Status Decision

This proposal is sufficient to move the planning question from `hold-for-rfc` to `hold-for-showcase` only if the compatibility matrix records that implementation remains blocked until a concrete showcase or gameplay acceptance case exists.

This RFC does not authorize:

- root package changes;
- `recast-navigation` installation;
- runtime NavigationSystem work;
- browser smoke implementation;
- generated navmesh artifacts as canonical source truth.

## Sinan-Owned Contract

Sinan owns:

- `NavigationConfig`
- `NavigationBuildRequest`
- `NavigationQuery`
- `NavigationPathResult`
- `NavigationBuildReport`
- `NavigationDiagnostic`
- lifecycle states;
- fallback statuses;
- generated artifact policy;
- query vocabulary;
- source geometry reference policy.

Candidate packages may only implement internal generation and query mechanics behind this contract.

## Proposed Types

### NavigationConfig

`NavigationConfig` should include:

- adapter id;
- diagnostics level;
- fallback mode;
- default agent profile id;
- build profile ids;
- generated artifact root;
- browser/WASM policy reference;
- bundle budget policy reference;
- stale artifact behavior.

It must not include package import paths, WASM chunk paths, or dependency-owned config objects.

### NavigationBuildRequest

`NavigationBuildRequest` should include:

- request id;
- region id;
- source geometry ids;
- scene snapshot id;
- agent profile id;
- area policy id;
- build profile id;
- output artifact policy;
- cache policy;
- metadata.

The request points at Sinan-owned geometry and policy ids. A future adapter may translate those ids into candidate-owned build settings at runtime or offline build time.

### NavigationQuery

`NavigationQuery` should include:

- query id;
- region id;
- scene snapshot id;
- agent profile id;
- start point;
- end point;
- allowed area ids;
- excluded area ids;
- max path cost;
- fallback preference.

The query vocabulary is Sinan-owned. A future adapter may translate it to Recast, waypoint, grid, or other internals.

### NavigationPathResult

`NavigationPathResult` should include:

- query id;
- status;
- path points in Sinan world coordinates;
- path cost;
- region id;
- agent profile id;
- source artifact id when used;
- diagnostics;
- fallback used flag.

Result statuses:

- `success`
- `no-route`
- `unavailable`
- `missing-artifact`
- `stale-artifact`
- `unsupported-platform`
- `wasm-blocked`
- `bundle-blocked`
- `fallback-used`
- `disposed`
- `failed`

### NavigationBuildReport

`NavigationBuildReport` should include:

- request id;
- status;
- region id;
- source geometry ids;
- source hash;
- agent profile id;
- area policy id;
- generated artifact metadata;
- diagnostics;
- stale markers;
- reproducible flag.

Build statuses:

- `success`
- `warning`
- `missing-source`
- `invalid-source`
- `artifact-blocked`
- `unsupported-platform`
- `wasm-blocked`
- `bundle-blocked`
- `stale`
- `failed`
- `disposed`

### NavigationDiagnostic

`NavigationDiagnostic` should include:

- code;
- severity;
- message;
- retryable flag;
- source id or artifact id when applicable;
- package-agnostic details.

Diagnostic codes should cover:

- `missing-artifact`
- `stale-artifact`
- `incompatible-artifact`
- `unsupported-platform`
- `wasm-load-failed`
- `bundle-budget-failed`
- `missing-source-geometry`
- `invalid-agent-profile`
- `no-route`
- `fallback-used`
- `disposed-adapter`

## Lifecycle

Lifecycle states:

- `unavailable`: navigation service is not present.
- `held`: policy or showcase gate blocks implementation.
- `loading`: future dependency or artifact loading is in progress.
- `building`: generated navigation output is being produced.
- `ready`: queries may run.
- `querying`: a query is in progress.
- `degraded`: fallback or stale artifact behavior is active.
- `failed`: adapter failed and must emit diagnostics.
- `disposed`: resources were released.

## Candidate-Owned Responsibilities

A future dependency candidate may own:

- navmesh generation internals;
- path query internals;
- WASM memory;
- candidate-owned disposal;
- performance tuning details;
- package-specific area mapping after Sinan normalization.

These responsibilities must not leak into authored JSON, editor store, runtime world state, migrations, timeline actions, event conditions, or director state.

## Fallback

Fallback is first-class. Valid fallback outcomes:

- no navigation service;
- static waypoint graph;
- grid or approximate pathing;
- local straight-line preview for editor diagnostics;
- unavailable state with structured diagnostics.

Fallback must keep scene/editor review usable and must not require recast-navigation.

## Browser, WASM, And Bundle Gates

Before implementation can proceed:

- RFC-011 must approve dependency, license, bundle, and WASM policy.
- Browser smoke must prove dynamic import, WASM load, path query, reload/cache behavior, failure fallback, and disposal.
- Bundle reports must measure initial JS, lazy chunks, and WASM assets.
- Import guards must prove candidate imports appear only inside the future adapter.
- Generated artifact guards must prove navmesh output remains rebuildable output.

## Future Implementation Gate

A future isolated implementation spike may be considered only when:

- this RFC or successor is accepted;
- the compatibility matrix records a status that still names remaining gates;
- a concrete showcase or gameplay acceptance case requires navigation;
- root package/config changes are explicitly authorized by a separate guide;
- browser/WASM/bundle validation commands are named before implementation.

## Hold, Reject, And Blocker Rules

Hold if showcase need is absent or browser/WASM validation is missing.

Reject if a candidate requires package-specific fields in canonical `data/**/*.json`.

Block if browser/WASM loading, bundle budget, license, or generated artifact policy fails.
