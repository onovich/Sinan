# Browser Smoke Environment Policy

Date: 2026-06-21
Scope: mature dependency adapter contract validation
Status: Required before runtime/editor implementation of browser-sensitive dependencies

## Purpose

Several mature dependency candidates depend on real browser behavior that cannot be proven by Node-only tests. This policy defines when Playwright/Chromium browser smoke is required before a future implementation guide may approve mainline integration.

## Browser Smoke Required For

- WASM asset load, dynamic import, cache, and reload behavior.
- Web Audio unlock, autoplay, decode, scheduling, and spatial panner behavior.
- IndexedDB availability, quota estimate, version upgrade, private-mode failure where possible, and cleanup behavior.
- Worker URL construction, transferable payloads, cancellation, timeout, and disposal.
- Dev-only Spector dynamic import and production exclusion.
- Navigation/Recast WASM load if RFC-013 ever leaves hold.

## Environment Contract

The smoke environment must record:

- Browser engine and version, preferably Playwright Chromium for automated checks.
- Local dev server command, selected port, and base URL.
- Timeout budget for first load, WASM load, worker boot, audio unlock, and storage operations.
- Asset path expectations for JS chunks, WASM files, worker files, and generated reports.
- Whether the run used headless or headed browser mode.
- Failure artifacts such as console logs, screenshots, trace, and normalized diagnostics.

## Pass Criteria

A browser smoke passes only when:

- The page loads without console errors relevant to the candidate.
- The candidate can initialize, report ready or an expected fallback, and dispose cleanly.
- Reload preserves the expected state or reports the expected fallback.
- Bundle-sensitive assets are served from the documented path.
- The adapter emits Sinan diagnostics rather than raw dependency objects.

## Failure Handling

Failures must be classified as:

- `environment`: local server, port, browser install, or timeout issue.
- `bundle`: JS chunk, worker URL, WASM asset, or cache path issue.
- `candidate`: dependency initialization or behavior issue.
- `contract`: adapter did not map result or error to Sinan-owned shape.
- `policy`: dependency is not allowed by RFC-011 or a hold policy.

## Documentation Requirement

Future implementation guides must link smoke evidence for every browser-sensitive dependency. If smoke cannot run, the candidate remains held or blocked and no mainline runtime/editor integration should proceed.
