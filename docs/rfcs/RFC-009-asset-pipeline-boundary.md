# RFC-009: Asset Pipeline Boundary

Date: 2026-06-21
Status: `adapter-spike-ready`
Related matrix row: `AssetPipelineAdapter` / glTF Transform and meshoptimizer

## Background And Evidence

The mature dependency spike validated glTF Transform and meshoptimizer as offline tooling candidates. The useful evidence is that they can inspect assets, transform mesh payloads, emit reports, and support optimization workflows without importing Three.js or runtime game modules.

This RFC accepts an `AssetPipelineAdapter` contract for offline processing. It does not approve generated assets as source-of-truth, root dependency changes, or runtime imports.

## Sinan-Owned Contract

Sinan owns:

- Asset ids, source asset paths, derived artifact paths, and manifest schema.
- Budget policy for triangle count, material count, texture size, binary size, and load-time risk.
- Variant policy for editor, preview, runtime, and showcase outputs.
- Compression profile names and their allowed target platforms.
- Report schema for warnings, errors, budget deltas, generated files, and reproducibility metadata.
- Rules for when generated artifacts are committed, ignored, or rebuilt.

The pipeline contract must let Sinan regenerate artifacts from source assets and a declared profile.

## Candidate-Owned Responsibilities

glTF Transform and meshoptimizer may own:

- Reading and writing glTF/GLB internals during an offline task.
- Mesh reorder, simplification, pruning, quantization, and binary buffer optimization.
- Asset inspection mechanics and low-level report details before normalization.
- Tool-specific warnings that are mapped into Sinan diagnostics.
- Node-side execution details in a build or content pipeline context.

Candidate output must be normalized into Sinan reports and manifests before other systems consume it.

## Forbidden Leakage

The following are forbidden:

- No glTF Transform or meshoptimizer imports from runtime game/editor modules.
- No generated artifact treated as the only copy of source asset truth.
- No JSON DSL field that requires a tool-specific transform option.
- No runtime loader path that depends on an offline tool package.
- No root dependency or lockfile change before RFC-011 and an implementation guide approve the dependency.

## Adapter Inputs And Outputs

Inputs:

- `AssetPipelineConfig` with source root, output root, profile id, budget id, diagnostics level, and cache policy.
- `AssetBuildRequest` with asset id, source path, variant id, compression profile, and expected output manifest entry.
- Optional baseline report for diffing budget changes.

Outputs:

- `AssetBuildReport` with normalized warnings, errors, source hash, tool versions, size deltas, budget pass/fail, and generated artifact paths.
- `AssetManifestPatch` with Sinan-owned asset ids, variant ids, artifact references, dimensions, and runtime load hints.
- `AssetPipelineDiagnostic` for unsupported format, tool failure, budget failure, stale source, or non-reproducible output.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `idle`: no asset task is running.
- `inspecting`: tool is reading source data.
- `transforming`: tool is producing artifacts.
- `reporting`: output is being normalized.
- `failed`: task produced no accepted artifact.
- `skipped`: source is unchanged or profile is unsupported.

Errors:

- Missing source asset.
- Unsupported glTF extension or buffer layout.
- Tool execution failure.
- Budget threshold exceeded.
- Generated artifact missing or non-deterministic.
- Manifest patch conflicts with an existing Sinan asset id.

Fallback:

The fallback path is raw asset pass-through with a budget warning. It may keep source assets referenced for editor preview, but it must not hide optimization failures or silently replace source truth.

## Validation Strategy

Before implementation can enter mainline, validation must include:

- Contract tests for manifest patch normalization and budget result classification.
- Fixture assets that exercise pass, warning, fail, and skipped states.
- Isolated glTF Transform smoke for inspect, transform, report, and artifact write.
- Isolated meshoptimizer smoke for optimization profile output where browser/runtime loading is not required.
- Reproducibility check that generated outputs can be deleted and rebuilt from source plus profile.
- Guard proving no offline tool import appears in runtime/editor modules.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-009 is accepted.
- RFC-011 approves bundle/dependency policy for Node/offline pipeline dependencies.
- The compatibility matrix still marks `AssetPipelineAdapter` as `adapter-spike-ready` or stronger.
- The implementation guide states where generated artifacts live and whether they are committed.
- A sample asset fixture proves report and manifest behavior.

## Hold, Reject, And Blocker Rules

Hold if:

- Source asset ownership and generated artifact ownership are not separated.
- The asset manifest schema is not stable enough to receive pipeline patches.
- Compression profiles are not named by Sinan.

Reject if:

- A tool requires runtime game modules to import offline packages.
- A generated artifact becomes the only durable source asset.

Block if:

- License or native/WASM packaging prevents deterministic local execution.
- The pipeline cannot emit a normalized report for CI or local validation.
