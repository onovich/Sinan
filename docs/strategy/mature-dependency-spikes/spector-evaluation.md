# Spector.js + Performance API Evaluation

Date: 2026-06-20
Candidate: Spector.js + Performance API
Package(s): `spectorjs@0.9.30`, browser Performance API
Official docs: https://github.com/BabylonJS/Spector.js
License: MIT for Spector.js
Install command: `npm install spectorjs`
Environment tested: Node 24.13.1, TypeScript 6.0.3, Vitest 4.1.9, Vite 8.0.16

## 1. Summary

Decision: dev-only

Performance API is suitable for Sinan-owned frame markers. Spector.js should remain dev-only behind a feature flag, `import.meta.env.DEV`, and dynamic import. It must not enter production runtime, overlay, or editor panel by default.

## 2. What Was Tested

- Performance mark/measure smoke.
- Disabled Spector feature flag path.
- Dynamic import guard for Spector.
- Vite production build without eager Spector import.

## 3. Results

- Node: Performance API smoke passed.
- Vite dev: not started. No port 5174 usage.
- Vite build: passed; Spector was not eagerly imported by the production path.
- Browser: actual WebGL capture not launched in this run.
- Playwright: blocked by missing Chromium 1228 and install timeout.

## 4. Integration Boundary

Sinan-owned:

- Runtime diagnostic schema.
- Frame budget report.
- System timing labels.
- Asset/draw/material warning surfaces.
- Dev feature flag policy.

Candidate-owned:

- WebGL frame capture tooling.
- Shader/draw call inspection UI.

Adapter boundary:

```txt
Sinan diagnostics feature flag
  -> dev-only Spector loader
  -> Spector.js capture
```

## 5. Risks

- License: MIT, clear.
- Bundle size: must not be included in production runtime.
- WASM/native: none.
- Browser support: WebGL capture can vary by browser/GPU.
- Maintenance: useful tool, but should be optional.
- Data/source-of-truth: diagnostic captures are not game/editor truth.
- Fallback: Performance API markers remain available without Spector.

## 6. Required Follow-up

- Define Sinan diagnostic event names and frame budget report.
- Add real dev browser capture after Playwright/browser environment is available.
- Enforce production exclusion in future mainline build tests if Spector is introduced.

## 7. Recommendation

Use only as a dev-only diagnostic tool. Do not add Spector.js to production runtime or editor panels in this phase.
