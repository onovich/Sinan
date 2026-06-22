# AssetPipeline Generated Artifact Policy

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`

## Source Truth

Source fixtures under `spikes/mature-dependencies/fixtures/**` remain the durable truth.

Generated optimized artifacts are rebuildable evidence. They must not replace source assets, mainline `public/**` assets, authored JSON data, or future production manifests.

## Current Spike Policy

Committed:

- Markdown reports and policy notes
- Small JSON validation summaries
- `reports/asset-pipeline/README.md`

Not committed:

- `reports/asset-pipeline/generated/**`
- large GLB outputs
- texture compression outputs
- `dist/**`
- `coverage/**`
- Playwright traces, screenshots, videos, or browser artifacts

## Guard

`smoke:asset-pipeline` removes and rejects generated artifact directories and large report artifacts. If generated outputs escape `reports/asset-pipeline/generated`, the boundary guard should fail.

## Future Mainline Gate

A future implementation guide must define:

- production generated artifact location
- commit vs rebuild policy
- manifest patch application workflow
- cache invalidation semantics
- size and texture budgets
- CI artifact retention
