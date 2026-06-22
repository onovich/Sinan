# Navigation Fallback And Showcase Gate

Date: 2026-06-22
Status: proposed gate for future navigation work

## Purpose

Navigation must not become a hidden hard dependency. Scene review, editor workflows, and non-navigation gameplay must continue when no navigation service exists.

This document defines fallback choices and the future conditions required before any NavigationAdapter implementation spike.

## Fallback Options

| Option | Behavior | Use Case | Limitation |
| --- | --- | --- | --- |
| No navigation service | Adapter reports `unavailable`; callers use authored placement or scripted motion. | Current default and any scene that does not require pathfinding. | No route queries. |
| Static waypoint graph | Authored points and links provide deterministic route hints. | Small showcase paths, cinematics, patrols, or designer-authored movement. | Manual authoring cost; weaker obstacle handling. |
| Grid or approximate fallback | Scene-space grid or coarse cells provide approximate paths. | Early editor preview or simple tactical movement. | Requires clear source-of-truth and can misrepresent final navmesh. |
| Straight-line preview | Editor-only diagnostic line from start to end. | Debugging query inputs when no service exists. | Not gameplay navigation. |
| Future navmesh adapter | Generated artifact plus query service behind NavigationAdapter. | Showcase/gameplay that needs robust pathfinding. | Requires RFC-011, browser/WASM, bundle, artifact, and showcase gates. |

Fallback must emit Sinan-owned diagnostics, not dependency exceptions or tool objects.

## Required Fallback Statuses

Future callers should be able to distinguish:

- `unavailable`: no navigation service exists;
- `fallback-used`: a simpler route strategy answered the request;
- `no-route`: a service exists but cannot find a path;
- `missing-artifact`: authored intent exists but generated navmesh is absent;
- `stale-artifact`: generated output is older than source geometry or profile policy;
- `unsupported-platform`: browser, runtime, or deployment target cannot support the service;
- `wasm-blocked`: WASM loading is blocked by policy or environment;
- `bundle-blocked`: bundle budget or asset path policy failed;
- `disposed`: resources were released.

## Showcase Gate

Navigation implementation may start only after a concrete showcase or gameplay acceptance case exists.

The acceptance case must name:

- target scene or level;
- actor type that needs navigation;
- required navigation behavior;
- expected fallback behavior when navigation is unavailable;
- acceptance check that can be observed by command, browser smoke, screenshot, or report;
- source data expected to remain canonical;
- generated artifacts expected to remain rebuildable output.

Examples that may satisfy the gate:

- an NPC patrol route that must avoid authored blocked areas;
- a directed editor preview that must validate agent reachability;
- a cinematic staging tool that must find paths around scene geometry;
- a gameplay prototype that requires dynamic route queries across a fixed test map.

Examples that do not satisfy the gate:

- interest in recast-navigation as a dependency;
- a generic desire for pathfinding;
- browser smoke passing without a scene acceptance case;
- generated navmesh output existing without a caller that needs it.

## Browser Smoke Requirements

A future NavigationAdapter browser smoke must prove:

- browser page loads without navigation-related console errors;
- dynamic import stays inside the adapter boundary;
- WASM asset loads from the documented path;
- a small fixture can initialize and answer at least one query;
- reload and cache behavior are stable;
- blocked WASM or missing asset falls back with Sinan diagnostics;
- disposal releases candidate resources;
- emitted result contains only Sinan-owned `NavigationPathResult` fields;
- generated artifact metadata remains rebuildable output.

The current browser smoke result for navigation is `POLICY-SKIP`; this goal does not add navigation smoke implementation.

## WASM And Bundle Gates

Before any navigation dependency is adopted, RFC-011 requires:

- dependency approval record;
- license and distribution note;
- measured initial JS, lazy chunk, and WASM asset sizes;
- bundle budget thresholds and warning/failure policy;
- dynamic import and code splitting design;
- cache and reload policy;
- import guard for dependency containment;
- exit strategy that preserves authored data.

For recast-navigation specifically, prior evidence recorded a large WASM-compatible chunk. A future guide must decide whether that chunk is acceptable, lazy-loaded, editor-only, or blocked.

## Implementation Spike Gate

A future isolated implementation spike must not start until all of these are true:

- RFC-014 or successor is accepted;
- compatibility matrix has been updated after architect review;
- showcase/gameplay acceptance case is named;
- RFC-011 dependency and bundle policy is accepted for the candidate;
- browser/WASM smoke commands are listed before code changes;
- generated artifact retention and cleanup policy is explicit;
- fallback behavior is testable without the dependency.

## Matrix Implication

If RFC-014 is accepted, the conservative matrix status should be `hold-for-showcase`, not `adapter-spike-ready`.

`hold-for-showcase` means the RFC gap is resolved but implementation still waits for the concrete acceptance case and browser/WASM evidence named above.

## Not Authorized

This gate does not authorize:

- recast-navigation import or install;
- root package or lockfile changes;
- browser smoke implementation for navigation;
- runtime NavigationSystem integration;
- authored `data/**/*.json` changes;
- generated navmesh artifacts as source truth.
