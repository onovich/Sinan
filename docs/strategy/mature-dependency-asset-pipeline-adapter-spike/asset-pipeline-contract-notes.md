# AssetPipelineAdapter Contract Notes

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`

## Contract Boundary

The isolated spike defines a Sinan-owned offline `AssetPipelineAdapter` contract in `spikes/mature-dependencies/src/asset-pipeline/asset-pipeline-types.ts`.

Public values are limited to:

- Stable Sinan asset ids, request ids, variant ids, profile ids, budget ids, manifest ids, and artifact ids
- Source asset refs and generated artifact refs
- Budget metrics and pass/warning/fail classification
- Manifest patch entries
- Source and profile hashes
- Rebuild and generated artifact policy
- Structured diagnostics

glTF Transform and meshoptimizer remain tool internals. Their objects, documents, transform options, and package paths are not part of the public report shape.

## Implemented Adapters

- `RawAssetPassThroughAdapter`: dependency-free fallback that references source assets, emits `fallback-used`, and never pretends optimization succeeded.
- `GltfAssetPipelineAdapter`: offline adapter that reads glTF/GLB sources, inspects metrics, writes a tiny GLB evidence artifact in tests, re-reads it, and normalizes the result into Sinan reports.

## Path Boundary

All public adapter methods validate and consume `NormalizedAssetBuildRequest.request` before filesystem reads or writes. The normalizer rejects empty, absolute, drive-qualified, UNC, URL-like, and traversal paths, and also verifies the resolved target remains inside the configured source or generated output root.

Rejected path policy violations report `path-blocked` with `path-traversal` diagnostics.

## Current Validation

- `npm --prefix spikes\mature-dependencies run check`: PASS.
- `npm --prefix spikes\mature-dependencies run smoke:asset-pipeline`: PASS.
- Boundary guard keeps offline tooling imports in adapter-owned files/tests/smoke.

## Mainline Gate

This spike does not approve root dependency changes, production asset manifest changes, runtime loader changes, editor import UI, or generated artifacts as source truth.
