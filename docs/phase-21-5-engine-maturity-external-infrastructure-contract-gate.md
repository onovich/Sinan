# Phase 21.5 Engine Maturity And External Infrastructure Contract Gate

Status: Scope locked for goal-mode execution.
Baseline commit: `9fc69a2 docs: finalize phase 21 shader production quality gate`.

## Baseline

Phase 20 and Phase 21 are PASS. Phase 21.5 starts from the pushed Phase 21 shader production quality gate baseline and stays before Phase 22 LOD/Instancing implementation.

Phase 21.5 is a contract and documentation gate. It prepares Sinan-owned boundaries for mature dependencies and external infrastructure cooperation, but it does not install runtime dependencies, implement external adapters, replace existing runtime systems, or migrate gameplay behavior.

## Scope Lock

Allowed deliverables:

- Review and align RFC-001 through RFC-004.
- Add RFC-005 for the Narrative/Inscape bridge boundary.
- Add RFC-006 for the Physics adapter boundary.
- Add RFC-007 for the Audio system boundary.
- Define adapter boundary policy for asset, input, camera, Runtime UI, physics, audio, and narrative systems.
- Add POC brief, mature dependency evaluation, adapter compatibility matrix, and boundary-check planning templates.
- Route roadmap documents through Phase 21.5 before Phase 22.
- Produce a final Phase 21.5 report and a Phase 22 handoff.

Non-goals:

- No runtime dependency installation.
- No real external adapter implementation.
- No LOD, instancing, input, physics, Runtime UI, audio, or narrative importer implementation.
- No Three.js imports outside the runtime boundary.
- No replacement of Sinan data files, schemas, registries, Director, Timeline, Runtime UI contracts, asset manifests, or editor save/undo ownership.

## Strategy Anchor

Sinan owns contracts. Partners own specialized implementations. POCs prove value. Validation protects boundaries. Successful adapters become optional first-party integrations.

This means every external project or mature library enters through a removable adapter, contract tests, diagnostics, fallback behavior, and dry-run or smoke evidence before any production integration can be considered.

## RFC Naming Decisions

The new Phase 21.5 RFCs are fixed as:

- `docs/rfcs/rfc-005-sinan-narrative-inscape-bridge-boundary.md`
  - Scope: Inscape and external narrative authoring may provide import/export or review assistance through dry-run bridge contracts.
  - Sinan keeps source-of-truth ownership of events, actions, timelines, camera shots, asset references, localization keys, validation, and runtime execution.
- `docs/rfcs/rfc-006-sinan-physics-adapter-boundary.md`
  - Scope: mature physics engines may provide collision, sweep, raycast, overlap, and controller solving through an adapter.
  - Sinan keeps source-of-truth ownership of collider authoring data, layers, trigger semantics, gameplay policy, deterministic fixture expectations, and fallback behavior.
- `docs/rfcs/rfc-007-sinan-audio-system-boundary.md`
  - Scope: browser audio, mixer, cue playback, timeline sync, ducking, and diagnostics may use mature libraries behind an adapter.
  - Sinan keeps source-of-truth ownership of AudioCue data, mix buses, Timeline/Event action references, unlock policy, localization links, and fallback/mute behavior.

## Round 21.5.1 Decision

The current Phase 21.5 working tree contains the active goal guide, existing external infrastructure strategy notes, RFC-001 through RFC-004, and roadmap routing updates. Round 21.5.1 accepts those as the scope-lock baseline for the remaining Phase 21.5 rounds.

Round 21.5.2 may add RFC-005, RFC-006, and RFC-007 only as contract documents. It must not add source code, dependencies, runtime adapters, or data migrations.
