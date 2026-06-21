# Adapter Boundary Policy

Status: Phase 21.5 contract gate policy.
Date: 2026-06-21.

## 1. Purpose

This policy defines where external projects and mature dependencies may connect to Sinan. It keeps Sinan's data, schemas, registries, validation, editor ownership, and runtime semantics as the source of truth while allowing specialized implementations behind removable adapters.

## 2. Core Rule

Sinan owns contracts. Partners and mature dependencies own specialized implementation. Every integration must pass through a Sinan-owned adapter, contract tests, diagnostics, fallback behavior, and dry-run or smoke evidence before it can become an optional first-party integration.

No adapter may replace:

- `data/**/*.json` source-of-truth ownership
- schema validation
- action, condition, UI action, or asset registries
- ReferenceResolver behavior
- Editor save, undo, or command ownership
- Director, Timeline, Event, World, or Runtime UI semantics
- Three.js runtime boundary ownership

## 3. Future Adapter Directories

These paths are reserved for future implementation phases. Phase 21.5 does not create source files in these directories.

```txt
src/assets/adapters/**
src/input/adapters/**
src/camera/adapters/**
src/ui/adapters/**
src/physics/adapters/**
src/audio/adapters/**
src/narrative/adapters/**
```

Path rules:

- `src/assets/adapters/**` may contain asset catalog, loader, scope, and report adapters.
- `src/input/adapters/**` may contain raw input backend, replay, virtual source, and rebind adapters.
- `src/camera/adapters/**` may contain camera pose solver and external rig adapters.
- `src/ui/adapters/**` may contain Runtime UI renderer adapters.
- `src/physics/adapters/**` may contain physics backend adapters.
- `src/audio/adapters/**` may contain audio backend adapters.
- `src/narrative/adapters/**` may contain narrative import, dry-run, and host bridge adapters.

Adapters may depend on mature libraries only when a future implementation guide explicitly approves the dependency and the relevant RFC acceptance criteria are met.

## 4. Import Rules

Semantic layers may import Sinan-owned facades and contracts, but not third-party backend implementations.

Allowed pattern:

```txt
src/game/** or src/events/**
  -> Sinan facade / registry / contract
  -> adapter interface
  -> adapter implementation
  -> third-party package or partner package
```

Disallowed pattern:

```txt
src/game/** or src/events/**
  -> third-party package
```

Three.js remains isolated to `src/runtime/three/**` and documented thin editor glue. Future adapters must not use Three.js from `src/game`, `src/events`, `src/director`, `src/world`, `src/physics`, `src/input`, `src/ui`, `src/renderer`, `src/schemas`, `src/data`, or `src/migrations`.

## 5. Adapter Acceptance Checklist

Every adapter proposal must provide:

- Source Of Truth statement.
- RFC link.
- adapter directory and owner.
- dependency and package list.
- license review.
- bundle size estimate and bundle budget impact.
- browser support notes.
- fallback plan.
- diagnostics model.
- contract tests.
- dry-run report or deterministic fixture.
- browser smoke or equivalent validation.
- compatibility matrix entry.
- removal plan.

## 6. Partner And Mature Dependency Gates

External partner gate:

1. Partner core or protocol works outside Sinan mainline.
2. Sinan writes a POC brief.
3. Partner produces deterministic reports, traces, packages, or snapshots.
4. Sinan validates through dry-run, contract tests, or smoke.
5. Compatibility matrix is updated.
6. Optional first-party adapter may be considered in a later implementation phase.

Mature dependency gate:

1. Candidate is evaluated in isolation.
2. license, bundle, browser support, maintenance, ESM/CJS, WASM, and worker behavior are recorded.
3. Candidate is mapped to a Sinan RFC and adapter path.
4. Contract fixture proves semantic equivalence.
5. fallback and diagnostics are documented.
6. A later implementation guide may approve an adapter spike.

## 7. Required Fallback Policy

Each adapter must define one of these fallback modes:

- no-op with diagnostics
- built-in simple backend
- deterministic placeholder asset or UI
- muted/drop behavior
- dry-run only
- feature disabled with user-visible report

Fallback must be usable in local validation and smoke runs. Missing backend, failed import, unsupported browser feature, or disabled feature flag must not corrupt source data.

## 8. Compatibility And Versioning

Adapter compatibility is recorded in `docs/strategy/adapter-compatibility-matrix-template.md` until a concrete matrix is promoted.

Minimum fields:

- Sinan phase and commit baseline
- RFC owner
- partner or dependency version
- adapter path
- supported browsers
- contract tests
- smoke evidence
- fallback status
- known limitations
- decision

## 9. Rejected Patterns

Rejected:

- direct dependency imports from semantic layers
- adapter code that writes source data without explicit import approval
- runtime hard dependency before RFC acceptance
- generated data without dry-run evidence
- third-party IDs becoming Sinan canonical IDs without mapping
- source data storing backend handles
- skipping contract tests because manual smoke passed
- replacing Sinan facades with partner APIs
