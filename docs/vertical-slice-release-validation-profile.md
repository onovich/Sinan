# Vertical Slice Release Validation Profile

Date: 2026-06-22
Phase: 26 Vertical Slice RC Hardening

This profile records the local release-candidate gate for the current Sinan vertical slice. It is a reproducible local validation profile, not deployment certification.

## Preferred Wrapper Gate

Run the project wrappers from `D:\LabProjects\Sinan`:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

`Validate.cmd` is the authoritative mechanical gate for format, typecheck, lint, build, Vitest, boundary checks, data validation, asset reporting, and migration checks. `Smoke.cmd` is the authoritative local browser gate for the current Playwright suite.

## Direct Command Equivalents

For developers without the Codex wrappers, run:

```powershell
npm ci
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run check-boundaries
npm run validate-data
npm run report-assets
npm run migrate-data -- --check
npm run test:smoke
git diff --check
```

The direct commands intentionally mirror the wrapper scope. If the wrapper configuration changes, update this profile and its quality gate in the same commit.

## Vertical Slice Evidence Covered

- Delivery showcase: `npm run test` and `npm run test:smoke` cover the Phase 24 Showcase Mode and delivery flow regressions.
- Multiplayer-lite social layer: `npm run test` and `npm run test:smoke` cover local simulated remotes, stamp diagnostics, invalid-message handling, and the local WebSocket room prototype evidence.
- Shader/postprocess low-end baseline: `npm run test:smoke` covers the local Chromium shader baseline; `npm run test` covers the quality inventory gate.
- LOD/scatter/spherical world: `npm run test` covers renderer diagnostics, LOD/scatter budgets, spherical placement, and low-end bias.
- Asset budget: `npm run report-assets` prints the committed asset manifest budget report and exits nonzero for critical issues.
- Migration safety: `npm run migrate-data -- --check` verifies committed data is already at the current schema version.
- Boundary safety: `npm run check-boundaries` prevents Three.js and dynamic-code patterns from leaking into disallowed layers.

## Budget And Perf Follow-up

Phase 26 will add or consolidate a dedicated vertical-slice budget report in the next hardening checkpoint. Until then, the release profile cites the existing Vitest, Playwright, and asset-report evidence rather than implying a single perf command exists.

## Local Limitations

- Browser smoke runs against local Vite and Playwright only.
- Mobile evidence is narrow viewport plus `styleQuality=low-end` Chromium evidence unless a real device run is explicitly recorded.
- The local WebSocket room remains a replaceable prototype. This profile does not certify production networking, auth, persistence, reconnect recovery, moderation, text chat, voice chat, or deployment.
