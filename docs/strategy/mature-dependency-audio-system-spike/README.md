# Mature Dependency AudioSystem Spike

Date: 2026-06-22
Branch: `codex/mature-dependency-audio-system-spike`
Base: `origin/codex/mature-dependency-worker-task-adapter-spike`
Status: Round 1 handoff entry

## Scope

This goal implements an isolated AudioSystem spike inside the mature dependency spike package. It is evidence for a future implementation guide, not production integration approval.

The spike may define and test a Sinan-shaped `AudioSystem` contract, deterministic silent/fake adapter, Web Audio adapter, browser smoke through the AudioSystem boundary, aggregate smoke scripts, reports, and validation summaries under the allowed paths only.

## Non-Scope

- No Sinan mainline `src/**` changes.
- No Sinan mainline `data/**` changes.
- No Sinan mainline `tests/**` changes.
- No Sinan mainline `public/**` changes.
- No root `package.json`, lockfile, Vite, TypeScript, Vitest, or workflow config changes.
- No root dependency install or upgrade.
- No howler.js, Tone.js, or other third-party audio wrapper adoption.
- No production `AudioSystem` runtime integration.
- No Phase 20, Phase 21, Phase 22, Phase 23, or Phase 24 implementation work.
- No Timeline, Director, Event DSL, gameplay sound delivery, or formal asset registry integration.
- No real audio asset files.
- No Web Audio node, decoded buffer, `AudioContext`, `HTMLAudioElement`, browser node id, or browser object in authored data, editor state, runtime world state, save files, project data, report snapshots, or caller-facing public shapes.

## Inputs

- `docs/rfcs/RFC-007-audio-system-boundary.md`
- `docs/rfcs/RFC-011-wasm-bundle-dependency-policy.md`
- `docs/rfcs/RFC-012-dev-only-diagnostics-policy.md`
- `docs/strategy/mature-dependency-contracts/adapter-compatibility-matrix.md`
- `docs/strategy/mature-dependency-contracts/final-contract-rfc-pack-report.md`
- `docs/strategy/mature-dependency-spikes/web-audio-evaluation.md`
- `docs/strategy/mature-dependency-browser-smoke/browser-smoke-results.md`
- `spikes/mature-dependencies/reports/browser-smoke/web-audio-summary.json`
- `spikes/mature-dependencies/src/web-audio/web-audio-smoke.ts`
- `spikes/mature-dependencies/src/web-audio/web-audio-smoke.test.ts`
- `spikes/mature-dependencies/src/browser-smoke/web-audio.pw.ts`
- `docs/strategy/mature-dependency-worker-task-adapter-spike/final-worker-task-adapter-spike-report.md`
- `spikes/mature-dependencies/src/worker-task/run-worker-task-smoke.mjs`

The active goal guide was dispatched from the planner workspace as `docs/strategy/mature-dependency-audio-system-spike-goal-mode-execution-guide-2026-06-22.md`. This isolated branch records implementation evidence under this directory rather than copying planner routing documents into unrelated paths.

## Evidence Baseline

RFC-007 accepts a Sinan-owned `AudioSystem` boundary. The compatibility matrix marks `AudioSystem` / Web Audio API as `accept-for-contract`, which permits an isolated adapter spike but does not approve direct mainline integration.

The browser smoke harness has real Playwright Chromium evidence for raw Web Audio behavior:

- Web Audio status: `PASS`.
- Browser port: `5184`; port `5174` is not used.
- Evidence file: `spikes/mature-dependencies/reports/browser-smoke/web-audio-summary.json`.
- Evidence includes AudioContext support, unlock behavior, autoplay/user gesture path, no console errors, mixer creation, spatial node creation, and one-shot scheduling.

That evidence is a prerequisite only. This spike must prove the path through `AudioSystem`, not raw `AudioContext`.

## Boundary Principle

```txt
Sinan owns AudioCue ids, asset references, bus/mixer policy,
timeline binding, spatial intent, user preference policy,
diagnostics, snapshots, and fallback semantics.

Web Audio owns AudioContext, AudioNode graph, decode behavior,
clock scheduling, browser autoplay policy, and low-level disposal only.

Authored data describes audio intent. It never describes Web Audio nodes.

data/**/*.json remains the canonical source-of-truth.
```

## Allowed Paths

- `spikes/mature-dependencies/**`
- `docs/strategy/mature-dependency-audio-system-spike/**`

## Forbidden Paths

- root `package.json`
- root `package-lock.json`
- root Vite / TypeScript / Vitest config
- `src/**`
- `data/**`
- `tests/**`
- `public/**`
- `.codex/**`
- Phase 20 / Phase 21 / Phase 22 / Phase 23 / Phase 24 files
- `spikes/mature-dependencies/node_modules/**`
- `spikes/mature-dependencies/dist/**`
- `spikes/mature-dependencies/coverage/**`
- `spikes/mature-dependencies/test-results/**`
- `spikes/mature-dependencies/playwright-report/**`
- Playwright traces, videos, screenshots, browser binaries, and cache folders

## Required Validation Commands

Round-level validation starts with:

```powershell
git status --short --branch
Test-Path docs\rfcs\RFC-007-audio-system-boundary.md
Test-Path docs\strategy\mature-dependency-spikes\web-audio-evaluation.md
Test-Path spikes\mature-dependencies\reports\browser-smoke\web-audio-summary.json
Test-Path docs\strategy\mature-dependency-audio-system-spike\README.md
git diff --check
```

Later rounds must also pass:

```powershell
npm --prefix spikes\mature-dependencies run check
npm --prefix spikes\mature-dependencies run smoke:browser
npm --prefix spikes\mature-dependencies run smoke:audio-system
```

## Artifact Policy

Commit source files, Markdown reports, small JSON summaries, and isolated package scripts only. Do not commit generated browser caches, Playwright traces, screenshots, videos, `dist/**`, `coverage/**`, `test-results/**`, `playwright-report/**`, or `node_modules/**`.

Existing uncommitted browser-smoke, storage-adapter, and worker-task JSON timestamp changes may be present from acceptance validation. They are validation artifacts and must not be mixed into AudioSystem round commits unless a later round intentionally updates AudioSystem-owned evidence.

## Round Plan

This guide uses 12 rounds:

- Round 1: branch isolation and README.
- Round 2: AudioSystem contract types, statuses, diagnostics.
- Round 3: AudioCue normalization and bus/mixer registry.
- Round 4: silent/fake adapter and contract tests.
- Round 5: WebAudio adapter lifecycle, unlock, context state.
- Round 6: play/stop/pause/resume, cue events, completion policy.
- Round 7: decode success/failure, missing asset, fallback.
- Round 8: spatial intent, listener updates, bus gain/mute.
- Round 9: browser smoke through AudioSystem, aggregate smoke script, reports.
- Round 10: buffer fixes for browser autoplay, timing, cleanup, flake, or validation feedback.
- Round 11: report consistency and review feedback.
- Round 12: final validation and handoff report.
