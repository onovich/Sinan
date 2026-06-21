# Boundary Check Planning Note

Status: Phase 21.5 planning note.
Date: 2026-06-21.

## 1. Current State

`scripts/check-boundaries.ts` already protects renderer-neutral source roots from direct Three.js imports and blocks dynamic code patterns across source, data, scripts, and tests.

Current renderer-neutral roots include:

```txt
src/engine
src/game
src/events
src/director
src/world
src/physics
src/input
src/ui
src/renderer
src/schemas
src/data
src/migrations
```

That means future `src/physics/**`, `src/input/**`, and `src/ui/**` code is already covered for Three.js import leakage when those directories exist.

## 2. Why Phase 21.5 Does Not Change The Script

Phase 21.5 is a documentation and contract gate. It reserves adapter paths but does not create source directories, install packages, or implement adapters. Updating the checker before concrete files exist would add policy without testable fixtures.

The correct Phase 21.5 output is this planning note plus the adapter boundary policy.

## 3. Future Adapter Roots To Guard

When future implementation phases create adapters, boundary checks should consider these paths:

```txt
src/assets/adapters/**
src/input/adapters/**
src/camera/adapters/**
src/ui/adapters/**
src/physics/adapters/**
src/audio/adapters/**
src/narrative/adapters/**
```

Planned rules:

- semantic layers must not import third-party backend packages directly
- adapters may import approved backend packages only from the documented adapter path
- backend handles must not appear in source data types
- dynamic code remains forbidden
- Three.js stays inside `src/runtime/three/**` or documented thin editor glue

## 4. Candidate Future Checks

Future checks may add:

- dependency allowlist per adapter path
- forbidden import patterns for backend packages outside their adapter path
- generated data ownership marker checks
- dry-run report schema checks
- compatibility matrix completeness checks
- contract tests presence checks
- smoke command presence checks
- fallback evidence checks

## 5. Validation Expectations

Before any future adapter is accepted:

- `npm run check-boundaries` passes.
- Contract tests pass.
- dry-run report or deterministic fixture is committed.
- browser smoke or equivalent validation exists.
- fallback behavior is exercised.
- compatibility matrix row is updated.

## 6. Phase 21.5 Decision

No code change is required in `scripts/check-boundaries.ts` during Phase 21.5. The script should be updated in the first implementation phase that creates real adapter files or introduces a candidate dependency.
