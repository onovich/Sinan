# Phase 21.5 POC Sequencing And Roadmap Routing

Status: Roadmap routing for the Phase 21.5 contract gate.
Date: 2026-06-21.

## 1. Purpose

Phase 21.5: Engine Maturity And External Infrastructure Contract Gate turns external cooperation and mature dependency research into Sinan-owned contracts before implementation phases depend on those systems.

This document routes future POCs without turning them into hard dependencies. Phase 21.5 remains documentation-only and does not install dependencies, create runtime adapters, or start Phase 22 implementation.

## 2. Current Gate

Current active gate:

```txt
docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md
```

Required Phase 21.5 outputs:

- RFC-001 through RFC-007.
- adapter boundary policy.
- partner POC brief template.
- mature dependency evaluation template.
- adapter compatibility matrix template.
- boundary-check planning note.
- final report and Phase 22 handoff.

## 3. Phase 22 Routing

Phase 22 remains the next implementation phase after Phase 21.5 PASS and pushed commits.

Phase 22 scope:

- LOD runtime/schema.
- InstancedMesh scatter.
- vegetation data.
- performance smoke checks.

Phase 22 must not wait for any partner or mature dependency unless a future Phase 22 guide explicitly makes a small POC part of that phase. The default Phase 22 path uses Sinan-owned contracts and existing runtime boundaries.

Optional supporting POC after Phase 21.5:

- Indirection manifest report and asset fallback loader POC may run beside or before Phase 22 only as a contract-tested adapter spike.
- It must not replace `data/assets.manifest.json`, ReferenceResolver, asset validation, or Three runtime ownership.

## 4. POC Sequence

### Lane A: Assets And Loading

Earliest useful timing: after Phase 21.5, before or beside Phase 22 if scoped separately.

Order:

1. Indirection manifest importer and report.
2. Fallback loader behind Sinan runtime contract.
3. Scene scope and preload diagnostics.
4. Variant or compression support only after prior POCs pass.

Required docs:

- `docs/rfcs/rfc-001-sinan-asset-boundary.md`
- `docs/strategy/partner-poc-brief-template.md`
- `docs/strategy/adapter-compatibility-matrix-template.md`

### Lane B: Input, Camera, And Physics

Earliest useful timing: Phase 23 planning or a separate adapter POC guide after Phase 22.

Order:

1. InputFlow replay and context lease fixture.
2. ViewRig camera pose trace and solver fixture.
3. Physics contract fixture without dependency.
4. Physics mature dependency spike only after contract fixture exists.

Required docs:

- `docs/rfcs/rfc-002-sinan-input-context.md`
- `docs/rfcs/rfc-004-sinan-camera-pose-shot-rig-boundary.md`
- `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`
- `docs/strategy/mature-dependency-evaluation-template.md`

### Lane C: Runtime UI, Audio, And Narrative

Earliest useful timing: Phase 24 planning or a separate adapter POC guide after Phase 23 has stable player/gameplay semantics.

Order:

1. Runtime UI headless ViewModel fixture.
2. Audio headless command fixture and browser unlock spike.
3. Inscape narrative package dry-run report.
4. Runtime UI, audio, and narrative coordination only after the individual fixtures pass.

Required docs:

- `docs/rfcs/rfc-003-sinan-runtime-ui-viewmodel.md`
- `docs/rfcs/rfc-005-sinan-narrative-inscape-bridge-boundary.md`
- `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`
- `docs/strategy/partner-poc-brief-template.md`

## 5. Promotion Gate

A POC can move toward implementation only if:

- Source Of Truth remains Sinan-owned.
- adapter path is identified.
- POC brief exists.
- contract tests exist.
- dry-run, report, trace, snapshot, command log, or deterministic fixture exists.
- smoke or equivalent validation exists.
- fallback behavior is proven.
- compatibility matrix row is updated.
- license, bundle, and browser support are reviewed when a package is involved.

## 6. Roadmap Entry Points

Route future executors through:

- `docs/development-plan.md`
- `docs/abeto-messenger-development-plan.md`
- `docs/post-mvp-execution-workflow.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate-goal-mode-execution-guide.md`
- `docs/phase-21-5-engine-maturity-external-infrastructure-contract-gate.md`
- this document

## 7. Phase 21.5 Decision

Phase 21.5 does not approve production integration for any external project or mature dependency. It approves only the contract, routing, evaluation, and compatibility gates needed before future implementation phases can make scoped decisions.
