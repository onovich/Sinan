# Mature Dependency AssetPipelineAdapter Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`
Base: `origin/codex/mature-dependency-physics-adapter-spike`

## Scope

This branch is an isolated mature-dependency spike for a Sinan-shaped offline `AssetPipelineAdapter`.
It converts the prior glTF Transform and meshoptimizer evidence into a narrow adapter contract and validation surface inside the spike package only.

Allowed committed paths:

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/**`

## Non-Scope

This spike does not approve or implement Sinan mainline asset pipeline integration.

Forbidden paths and work:

- Sinan mainline `src/**`, `data/**`, `tests/**`, `public/**`
- root `package.json`, lockfiles, Vite/TypeScript/Vitest config, `.codex/**`, `Role.md`
- Phase 20/21/22/23/24/25 documents or reports
- runtime asset loading, editor import UI, gameplay asset behavior, production manifest schema, or public asset rewrites
- replacing source assets with generated optimized artifacts
- KTX2, Basis, Draco, or production texture compression policy
- root dependency approval or mainline package changes

## Architecture Inputs

Required policy and evidence:

- `docs/rfcs/RFC-009-asset-pipeline-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/strategy/mature-dependency-spikes/gltf-transform-evaluation.md`
- `docs/strategy/mature-dependency-spikes/dependency-installation-audit.md`
- `spikes/mature-dependencies/src/gltf-transform/gltf-transform-smoke.ts`
- `spikes/mature-dependencies/src/gltf-transform/gltf-transform-smoke.test.ts`
- `spikes/mature-dependencies/fixtures/minimal-triangle.gltf`
- `spikes/mature-dependencies/reports/gltf-transform-report.json`
- `docs/strategy/mature-dependency-physics-adapter-spike/final-physics-adapter-spike-report.md`

## Boundary Principle

Sinan owns asset ids, source asset refs, output artifact refs, budget and variant policies, compression profile names, manifest patch shape, diagnostics, cache and rebuild policy, and generated artifact rules.

glTF Transform and meshoptimizer own only offline glTF/GLB parsing, inspection, transformation, optimization mechanics, serialization, and low-level tool diagnostics before normalization.

Public adapter results must use Sinan-owned ids, statuses, diagnostics, source hashes, artifact refs, report metrics, and manifest patch records. Tool objects, NodeIO documents, meshoptimizer internals, package paths, and generated artifact implementation details must not leak across the contract.

## Evidence Baseline

The existing raw glTF Transform smoke is PASS:

- fixture: `spikes/mature-dependencies/fixtures/minimal-triangle.gltf`
- tool path: Node/offline only
- tested behavior: glTF read, inspect before/after, meshoptimizer-backed reorder, prune, GLB write, GLB readback, deterministic JSON report
- report: `spikes/mature-dependencies/reports/gltf-transform-report.json`

This baseline is not sufficient for mainline production integration. This spike must prove the same capability through an `AssetPipelineAdapter` contract, including fallback, manifest patch normalization, budget classification, rebuild semantics, and generated artifact policy.

## Planned Deliverables

- `spikes/mature-dependencies/src/asset-pipeline/**`
- `spikes/mature-dependencies/reports/asset-pipeline/**`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-contract-notes.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-smoke-results.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-evidence-matrix.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/asset-pipeline-generated-artifact-policy.md`
- `docs/strategy/mature-dependency-asset-pipeline-adapter-spike/final-asset-pipeline-adapter-spike-report.md`

## Round Plan

| Round | Target |
| --- | --- |
| 1 | Branch isolation and this README |
| 2 | AssetPipelineAdapter contract types and diagnostics |
| 3 | Request, profile, budget, and path normalization |
| 4 | Raw pass-through fallback adapter |
| 5 | glTF Transform adapter lifecycle and inspect |
| 6 | Transform, write, re-read, and generated artifact policy |
| 7 | Manifest patch and budget report classification |
| 8 | Rebuild, cache, and stale-source checks |
| 9 | Aggregate smoke, boundary guard, evidence docs |
| 10 | Buffer round for fixture, report, cleanup, or determinism fixes |
| 11 | Buffer round for reviewer consistency and policy fixes |
| 12 | Final validation and handoff report |

## Validation Commands

Round-level validation follows the execution guide. Final validation must include:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:asset-pipeline
git diff --check
git status --short --branch
```

## Artifact Policy

Source fixtures are durable truth. Generated optimized outputs are rebuildable evidence and must be either tiny, documented, and committed intentionally, or cleaned and left uncommitted by policy.

Do not commit Playwright traces, videos, screenshots, browser binaries, cache folders, `dist/**`, `coverage/**`, `node_modules/**`, `test-results/**`, `playwright-report/**`, or large generated GLB/texture artifacts.
