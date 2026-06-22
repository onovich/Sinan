# Mature Dependency Browser Smoke Environment Audit

Date: 2026-06-21, updated 2026-06-22
Round: 2
Branch: `codex/mature-dependency-browser-smoke-harness`
Scope: isolated `spikes/mature-dependencies` Playwright / Chromium audit
Original status: `ENVIRONMENT-BLOCKED`
Current status after 2026-06-22 repair pass: `PASS`

## Summary

The isolated package has Playwright installed and callable, but the required Playwright-managed Chromium 1228 browser payload is not fully installed. Browser launch currently fails because the expected Playwright Chromium Headless Shell executable is missing. Re-running `playwright install chromium` timed out and left install/download processes that had to be cleaned up.

This means browser-dependent candidate PASS results must not be claimed yet. The goal may continue building harness structure and normalized reporting, but the final goal status must remain BLOCKED unless the Playwright-managed browser can be installed and launched.

2026-06-22 update: the required Playwright Chromium 1228 and Headless Shell 1228 payloads are now present in the user-level Playwright cache. `chromium.launch({ headless: true })` succeeds and reports browser version `149.0.7827.55`; `npm --prefix spikes\mature-dependencies run smoke:browser` now runs real browser tests. The original environment-blocked evidence remains below as historical acceptance context.

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm --prefix spikes\mature-dependencies exec playwright --version` | Misleading output | Without `--`, npm printed `11.8.0`, which is npm's version, not Playwright. |
| `npm exec -- playwright --version` from `spikes/mature-dependencies` | PASS | Reported `Version 1.61.0`. |
| `npm exec -- playwright install chromium` from `spikes/mature-dependencies` | `ENVIRONMENT-BLOCKED` | Timed out after about 124 seconds in this round. Earlier spike report recorded a 304 second timeout. |
| `node -e "import('playwright').then(({chromium})=>console.log(chromium.executablePath()))"` | PASS for expected path only | Returned `C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`, but the file did not exist. |
| `node -e "import('playwright').then(async ({chromium})=>{const browser=await chromium.launch({headless:true}); console.log(browser.version()); await browser.close();})"` | FAIL | Launch failed because `chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe` does not exist. |
| `Test-Path $env:LOCALAPPDATA\ms-playwright\chromium-1228\chrome-win64\chrome.exe` | FAIL | Returned `False`. |
| `Test-Path $env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe` | FAIL | Returned `False`. |

## Observed Cache State

The Playwright cache still contains older browser payloads:

- `chromium-1217`
- `chromium_headless_shell-1217`
- `ffmpeg-1011`
- `winldd-1007`

The required `chromium-1228` and `chromium_headless_shell-1228` payloads were not present after the timed install attempt.

## Process Cleanup

The timed install left Node processes for:

- `npm --prefix spikes\mature-dependencies exec playwright install chromium`
- `playwright cli.js install chromium`
- `playwright-core\lib\entry\oopBrowserDownload.js`
- `npm exec -- playwright install chromium`

Only those install/download processes tied to `D:\LabProjects\Sinan-MatureDependencySpikes\spikes\mature-dependencies` were stopped. Unrelated user/system Node or Chrome processes were left untouched.

## Failure Classification

Layer: `environment`

Candidate impact:

- Web Audio browser smoke: originally `ENVIRONMENT-BLOCKED`; now `PASS` after Chromium launch repair.
- Dexie / IndexedDB browser smoke: originally `ENVIRONMENT-BLOCKED`; now `PASS` after Chromium launch repair.
- Comlink / Web Worker browser smoke: originally `ENVIRONMENT-BLOCKED`; now `PASS` after Chromium launch repair.
- Spector dev-only guard smoke: originally `ENVIRONMENT-BLOCKED`; now `PASS` after Chromium launch repair.
- Rapier / WASM browser smoke: originally `ENVIRONMENT-BLOCKED`; now `PASS` after Chromium launch repair, using `@dimforge/rapier3d-compat` as the exercised browser package while skipping the base package diagnostic import in browser runtime.
- recast-navigation: remains `POLICY-SKIP` because RFC-013 holds navigation regardless of browser availability.

## Repro Command

```powershell
cd D:\LabProjects\Sinan-MatureDependencySpikes\spikes\mature-dependencies
npm exec -- playwright --version
npm exec -- playwright install chromium
node -e "import('playwright').then(async ({chromium})=>{const browser=await chromium.launch({headless:true}); console.log(browser.version()); await browser.close();})"
```

## Architecture Boundary Check

- Root package/config modified: no.
- Sinan `src/**` modified: no.
- Sinan `data/**` modified: no.
- Sinan `tests/**` modified: no.
- Sinan `public/**` modified: no.
- `.codex/**` modified: no.
- Browser binaries/cache committed: no.
- Port `5174` used: no.

## 2026-06-22 Repair Self-Check

Debug self-check: Playwright package `1.61.0` locates Chromium 1228, launches headless Chromium, and completes `smoke:browser` with 7 passed Playwright tests.

Architecture self-check: repair state lives in the Playwright user cache outside the repository. Repository changes remain limited to the isolated spike harness and browser-smoke reports; no browser binaries, cache folders, traces, videos, screenshots, `dist/**`, `coverage/**`, or `node_modules/**` are committed.
