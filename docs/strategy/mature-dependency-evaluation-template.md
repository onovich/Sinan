# Mature Dependency Evaluation Template

Status: Phase 21.5 template.
Date: 2026-06-21.

Use this template before approving a mature dependency for a future Sinan adapter spike. Evaluation may happen in an isolated spike, but production integration requires a later implementation guide.

## 1. Candidate

- Package or project:
- Version:
- Domain:
- Related RFC:
- Proposed adapter path:
- Evaluator:
- Evaluation date:
- Baseline commit:

## 2. Decision

Choose one:

- accept-for-adapter-spike
- hold-for-rfc-or-policy
- reject
- blocked

Decision notes:

## 3. License And Maintenance

- license:
- license risk:
- repository:
- release cadence:
- maintainer activity:
- issue health:
- security advisories:

## 4. Bundle And Runtime Impact

- bundle size estimate:
- tree-shaking behavior:
- ESM/CJS support:
- side effects:
- worker support:
- WASM requirements:
- async initialization:
- production build behavior:

## 5. Browser Support

- Chromium:
- Firefox:
- Safari:
- mobile browser support:
- WebGL/WebGPU/Web Audio/WASM requirements:
- autoplay, permission, or gesture requirements:
- unsupported-browser fallback:

## 6. Sinan Boundary Fit

- Source Of Truth retained by Sinan:
- adapter path:
- facade or contract:
- forbidden import risks:
- data handle leakage risk:
- generated data risk:
- editor save/undo risk:
- Director/Timeline/Event risk:

## 7. Contract Tests

- fixture:
- expected output:
- error cases:
- deterministic replay or snapshot:
- disabled-backend behavior:
- fallback coverage:

## 8. Dry-Run Or Smoke Evidence

- dry-run report:
- headless test:
- browser smoke:
- visual smoke:
- performance smoke:
- diagnostic output:

## 9. Compatibility Matrix Notes

- supported Sinan phase:
- dependency version:
- adapter compatibility:
- known limitations:
- fallback status:
- required follow-up:

## 10. Risk Register

| Risk | Severity | Mitigation | Owner |
| --- | --- | --- | --- |
| license unclear | high | block until resolved | |
| bundle too large | medium | isolate adapter and measure | |
| browser support incomplete | medium | require fallback | |
| contract tests missing | high | hold until fixture exists | |

## 11. Approval Checklist

- license reviewed.
- bundle impact reviewed.
- browser support reviewed.
- fallback plan documented.
- contract tests planned.
- dry-run or smoke evidence exists.
- compatibility matrix updated.
- no source-of-truth replacement.
- no semantic-layer direct imports.
- no production integration before a later implementation guide.
