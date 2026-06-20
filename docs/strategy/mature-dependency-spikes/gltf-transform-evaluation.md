# glTF Transform + meshoptimizer Evaluation

Date: 2026-06-20
Candidate: glTF Transform + meshoptimizer
Package(s): `@gltf-transform/core@4.4.0`, `@gltf-transform/functions@4.4.0`, `@gltf-transform/extensions@4.4.0`, `@gltf-transform/cli@4.4.0`, `meshoptimizer@1.1.1`
Official docs: https://gltf-transform.dev/ and https://gltf-transform.dev/cli
License: MIT for glTF Transform and meshoptimizer
Install command: `npm install @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions @gltf-transform/cli meshoptimizer`
Environment tested: Node 24.13.1, TypeScript 6.0.3, Vitest 4.1.9

## 1. Summary

Decision: accept-for-adapter-spike

glTF Transform and meshoptimizer are viable for an offline asset pipeline spike. They should not enter Sinan runtime truth or mutate production assets directly. The smoke read `spikes/mature-dependencies/fixtures/minimal-triangle.gltf`, inspected it, ran meshoptimizer-backed reorder, serialized it to GLB bytes, read it back, and wrote a deterministic JSON report.

## 2. What Was Tested

- Minimal triangle glTF fixture read from `spikes/mature-dependencies/fixtures/minimal-triangle.gltf`.
- Inspect report before and after transform.
- `MeshoptEncoder.ready`.
- `reorder({ encoder: MeshoptEncoder })`.
- GLB write and read round trip via `NodeIO`.
- Deterministic report generation at `spikes/mature-dependencies/reports/gltf-transform-report.json`.

## 3. Results

- Node: passed.
- Vite dev: not applicable for NodeIO/offline pipeline smoke.
- Browser: not included in browser entry; this candidate is offline tooling.
- Playwright: not applicable for this smoke.

## 4. Integration Boundary

Sinan-owned:

- Asset id.
- Asset manifest.
- Budget policy.
- Variant policy.
- Loader fallback policy.
- Asset report format.
- Compression profile.

Candidate-owned:

- GLB/glTF parse, inspect, write.
- Mesh reorder and optimization transforms.
- Extension-aware offline processing.

Adapter boundary:

```txt
Sinan asset manifest/build profile
  -> offline asset pipeline adapter
  -> glTF Transform / meshoptimizer
```

## 5. Risks

- License: MIT, clear.
- Bundle size: should remain offline and out of production runtime.
- WASM/native: meshoptimizer loads JS/WASM-like optimizer code; KTX2/Basis/toktx remain future external tooling decisions.
- Browser support: not a runtime browser dependency in this spike.
- Maintenance: active ecosystem.
- Data/source-of-truth: optimized outputs must never replace manifest/source truth.
- Fallback: pipeline must remain rerunnable and diffable.

## 6. Required Follow-up

- Define Sinan asset build profile and report schema.
- Decide KTX2/Basis/Draco policy separately.
- Keep generated optimized assets ignored unless a release artifact policy says otherwise.

## 7. Recommendation

Proceed to a future offline asset pipeline adapter spike. Do not wire this into runtime loaders in the current phase.
