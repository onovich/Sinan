# Phase 0-7 Acceptance Remediation Instructions

This document is a targeted repair handoff for the AI agent that implemented Phase 0 through Phase 7.

The current repository is close, but do not mark the long-running goal complete yet. Mechanical validation passes, but strict acceptance still has blockers.

## Current Validation Status

The following checks passed during acceptance review:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run validate-data
```

Observed results:

- 21 Vitest files passed.
- 71 tests passed.
- `validate-data` passed for 4 prefabs, 1 level, 3 events, 1 timeline, 1 camera shot, and 5 assets.
- Dev server health smoke passed at `http://127.0.0.1:5174/`.
- No forbidden `three` imports were found in `src/events`, `src/director`, `src/schemas`, `src/data`, or other protected semantic layers.
- Git was clean and synced with `origin/main` at acceptance time.

## Final Acceptance Result

Status: not yet complete.

Reason: strict Completion Criteria from `docs/ai-goal-mode-development-instructions.md` are not fully satisfied.

There are two blockers and one important gap:

1. Action schema and default action registry are inconsistent.
2. Condition schema and default condition registry are inconsistent.
3. Real browser/Playwright smoke coverage is missing.

## Blocker 1: Action Schema And Registry Mismatch

### Problem

`src/schemas/action.schema.ts` defines these action types:

```txt
animation.play
animation.stop
camera.playShot
door.close
door.open
entity.animateTransform
entity.setEnabled
entity.setTransform
entity.setVisible
flag.set
flag.toggle
function.call
sound.play
subtitle.show
switch.setState
timeline.play
timeline.stop
```

But `src/events/actionRegistry.ts` currently registers only:

```txt
door.close
door.open
entity.setVisible
flag.set
flag.toggle
switch.setState
timeline.play
timeline.stop
```

Missing registered handlers:

```txt
animation.play
animation.stop
camera.playShot
entity.animateTransform
entity.setEnabled
entity.setTransform
function.call
sound.play
subtitle.show
```

This violates the architecture rule that every action exposed to JSON must have schema plus registry handling. It also creates a runtime failure path: data can pass schema validation but fail when dispatched.

### Relevant Files

- `src/schemas/action.schema.ts`
- `src/events/actionRegistry.ts`
- `src/events/ActionSystem.ts`
- `src/events/types.ts`
- `src/events/events.test.ts`
- `src/data/validateProject.ts`
- `src/data/ReferenceResolver.ts`
- `scripts/validate-data.ts`

### Required Fix

Choose one of the two valid strategies.

Preferred strategy: register all schema-supported action types.

Implement handlers in `createDefaultActionRegistry()` for:

- `entity.setEnabled`
- `entity.setTransform`
- `entity.animateTransform`
- `camera.playShot`
- `animation.play`
- `animation.stop`
- `sound.play`
- `subtitle.show`
- `function.call`

If an action cannot fully execute yet, implement a deterministic command-queue behavior instead of doing nothing. For example:

- `animation.play` and `animation.stop` should call `context.runtime?.playAnimation()` / `context.runtime?.stopAnimation()` when runtime exists, or push a typed command if that is the project pattern.
- `camera.playShot` should enqueue or route a director command, or call a director/runtime bridge if available.
- `sound.play` and `subtitle.show` can push typed commands into `directorCommands` if the runtime audio/subtitle layer is not real yet.
- `entity.setTransform` should update event/runtime state and call `context.runtime?.setTransform()`.
- `entity.animateTransform` should either enqueue a director/runtime command or be removed from the schema until supported.
- `function.call` must use a whitelist registry. Do not use `eval`, `new Function`, or `window[name]`.

Alternative strategy: narrow `ActionSchema`.

Remove unsupported action types from `ActionSchema` until they are implemented. Only use this if the project owner agrees to reduce the DSL surface.

### Required Tests

Add tests that fail if schema and registry drift again.

Suggested test:

```ts
import { ActionSchema } from '../schemas/action.schema'
import { createDefaultActionRegistry } from './actionRegistry'

it('registers every schema-supported action type', () => {
  const registry = createDefaultActionRegistry()
  const schemaTypes = ActionSchema.options.map((option) => option.shape.type.value)

  expect(schemaTypes.filter((type) => !registry.has(type))).toEqual([])
})
```

Also add behavior tests for every newly registered action.

## Blocker 2: Condition Schema And Registry Mismatch

### Problem

`src/schemas/condition.schema.ts` defines:

```txt
flag.equals
flag.exists
inventory.hasItem
quest.stateEquals
entity.stateEquals
distance.lessThan
custom.condition
```

But `src/events/conditionRegistry.ts` registers only:

```txt
flag.equals
flag.exists
inventory.hasItem
quest.stateEquals
entity.stateEquals
```

Missing registered evaluators:

```txt
distance.lessThan
custom.condition
```

### Relevant Files

- `src/schemas/condition.schema.ts`
- `src/events/conditionRegistry.ts`
- `src/events/ConditionSystem.ts`
- `src/events/types.ts`
- `src/events/events.test.ts`

### Required Fix

Preferred strategy: register all schema-supported condition types.

Implement:

- `distance.lessThan`
- `custom.condition`

For `distance.lessThan`, add the minimum state/runtime access needed to resolve entity positions. If the event runtime state does not currently store transforms, either:

- add a safe `entityTransforms` map to the runtime state, or
- route the lookup through a resolver on the condition context, if you refactor `ConditionSystem` to accept one.

For `custom.condition`, add an explicit whitelist registry. Do not use dynamic function execution.

Alternative strategy: narrow `ConditionSchema`.

Remove unsupported condition types until the evaluator exists. Only use this if the project owner agrees to reduce the DSL surface.

### Required Tests

Add tests that fail if schema and registry drift again.

Suggested test:

```ts
it('registers every typed condition exposed by the schema', () => {
  const registry = createDefaultConditionRegistry()
  const schemaTypes = [
    'flag.equals',
    'flag.exists',
    'inventory.hasItem',
    'quest.stateEquals',
    'entity.stateEquals',
    'distance.lessThan',
    'custom.condition',
  ]

  expect(schemaTypes.filter((type) => !registry.has(type))).toEqual([])
})
```

Also add behavior tests for the new evaluators.

## Blocker 3: Registry Coverage Missing From Data Validation

### Problem

`npm run validate-data` currently validates JSON structure and references, but it does not verify that all action/condition types used by project data are registered.

This means schema-valid JSON can still fail during runtime dispatch.

### Required Fix

Extend validation so `npm run validate-data` checks:

- every event action type is registered
- every timeline action-marker type is registered
- every condition typed node is registered
- every custom function/custom condition name is whitelisted, if custom registries exist

Relevant files:

- `src/data/validateProject.ts`
- `src/data/ReferenceResolver.ts`
- `scripts/validate-data.ts`
- `src/events/actionRegistry.ts`
- `src/events/conditionRegistry.ts`

Add negative tests in `src/data/validateProject.test.ts`.

## Important Gap: Real Browser Or Playwright Smoke

### Problem

Phase 6.5 and final Completion Criteria require Playwright/browser smoke tests for editor surfaces.

Current coverage has `src/editor/panels/TimelinePanelSmoke.test.tsx`, but it uses `renderToStaticMarkup`. That is useful but not a real browser smoke test.

The acceptance review only performed HTTP health smoke, not interactive browser automation.

### Required Fix

Add real Playwright smoke coverage, or an equivalent browser-driven test if Playwright is deliberately not used.

Required smoke checks:

1. Page opens with no console errors.
2. Editor shell exists.
3. Canvas exists and is nonblank.
4. Timeline panel exists.
5. Playhead can move by changing the range input.
6. A track or marker can be selected.
7. Trigger bounds toggle exists and does not crash.

Recommended files:

- `playwright.config.ts`
- `tests/smoke/editor.spec.ts` or `src/editor/editor.smoke.spec.ts`
- update `package.json` with a script such as `smoke` or `test:smoke`
- update `.codex/project-ops-workflow.json` to include the smoke command

If installing browser binaries is not practical in this environment, document that explicitly and add a fallback browser automation note. Do not claim Playwright acceptance is complete without a real browser run.

## Important Gap: Placeholder Model Loading

### Observation

`src/runtime/three/ThreeRuntime.ts` currently implements `loadModel()` as metadata registration and `instantiateModel()` creates placeholder geometry.

This was acceptable earlier as a Phase 1 fallback when no GLB assets exist, but the original architecture expects GLB/glTF loading.

Relevant lines:

- `src/runtime/three/ThreeRuntime.ts` around `loadModel`
- `src/runtime/three/ThreeRuntime.ts` around `createPlaceholderObject`

### Required Decision

Decide one of the following:

1. Implement real GLB loading with `GLTFLoader`, while keeping placeholder fallback for missing local assets.
2. Document placeholder-only runtime as an explicit MVP limitation, and do not claim full GLB pipeline acceptance.

This is not as blocking as the registry mismatch, but it should be resolved before calling the implementation production-ready.

## Required Commands After Fixes

Run all of these:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run validate-data
```

If a browser smoke script is added, also run it:

```powershell
npm run smoke
```

or:

```powershell
npm run test:smoke
```

Also run architecture checks:

```powershell
rg 'from [''"]three[''"]|import \* as THREE|require\([''"]three[''"]\)|THREE\.' src/events src/director src/world src/schemas src/data src/migrations
rg 'eval\(|new Function|window\[' src data scripts
```

The first command should return no forbidden semantic-layer Three.js imports. The second should return no real dynamic-code execution. Test strings that assert rejection are acceptable only after manual review.

## Completion Checklist

Do not report the original long-running goal as complete until all boxes are satisfied:

- [ ] All action schema types are registered or unsupported action schema types are removed.
- [ ] All condition schema types are registered or unsupported condition schema types are removed.
- [ ] `validate-data` fails on unregistered action/condition usage.
- [ ] No `eval`, `new Function`, dynamic `window[name]`, or raw script-code DSL is introduced.
- [ ] Full mechanical validation passes.
- [ ] Real browser/Playwright smoke passes, or a documented approved fallback exists.
- [ ] Architecture boundary checks pass.
- [ ] Demo data still covers player spawn, switch, locked gate, key/condition, event, action, timeline, camera shot, animation, subtitle/sound/flag where assets permit.
- [ ] Git status is clean.
- [ ] Final fixes are committed and pushed to `origin/main`.

## Suggested Commit Messages

Use small commits:

```txt
fix: align action registry with action schema
fix: align condition registry with condition schema
test: validate registry coverage for project data
test: add browser smoke for editor workflow
docs: document model loading mvp limitation
```
