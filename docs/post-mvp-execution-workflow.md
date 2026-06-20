# Post-MVP Execution Workflow

This workflow is for an AI coding agent continuing Sinan Scene Director after Phase 0-7 acceptance.

Use it together with:

- `docs/post-mvp-development-plan.md`
- `docs/development-plan.md`
- `docs/Sinan_Scene_Director_研发方案与架构指南.md`
- `AGENTS.md`
- `.codex/project-ops-workflow.json`
- `.codex/project-git-workflow.json`

## Goal Mode Objective

Use this objective for the next long-running goal:

```txt
Complete the core post-MVP roadmap for Sinan Scene Director, Phase 8 through Phase 14, following docs/post-mvp-development-plan.md and docs/post-mvp-execution-workflow.md. Keep every phase tested, browser-smoked, architecture-safe, documented, committed, and pushed.
```

The earlier optional advanced-gameplay track is superseded by the Abeto route unless the user explicitly asks for Rapier, character-control, or dialogue/quest work outside that route.

After Phase 14, the next product route is the Abeto Messenger-like vertical slice. Use `docs/abeto-messenger-development-plan.md` as the roadmap and phase-specific goal-mode guides. Phase 15 is a scope-lock and handoff phase, Phase 16 is Stylized Runtime Foundation, Phase 17 is Asset Budget And Compression, Phase 18 is Shader GLSL Material Runtime Foundation, Phase 18.5 is Engine Core Alignment, and Phase 19 is Shader Dissolve And Material Timeline. The Web3D Shader GLSL MVP docs are now integrated into this route: Phase 17 prepares texture metadata and loader policy, Phase 18 establishes the S0 material runtime foundation, Phase 18.5 establishes the engine/session/world root, Phase 19 proves a production story material through timeline/action/editor paths, and later LOD/world/gameplay phases move after the shader track.

The next executor should start by reading `AGENTS.md`, the main architecture guide, the Abeto roadmap, both Web3D Shader GLSL MVP docs, and the active goal guide.

Routine validation now includes `npm run report-assets` through `.codex/project-ops-workflow.json`. Executors should still run it directly when changing asset metadata, public asset files, compression readiness, or release notes.

Phase 18 adds a Chromium shader compile smoke under `npm run test:smoke`. Run smoke after changing `src/shaders/**`, `src/runtime/materials/**`, `src/runtime/three/materials/**`, renderable material data flow, or fallback/diagnostic behavior.

Phase 18.5 is PASS. The current active goal-mode guide is `docs/phase-19-shader-dissolve-material-timeline-goal-mode-execution-guide.md`. Phase 19 should use the new `EngineSession`/`EditorSessionBridge` path for material timeline/action behavior instead of reintroducing runtime orchestration into `src/editor/Viewport.tsx`. The guide uses a 16-round budget: 12 implementation rounds, 3 buffer rounds, and 1 final validation/handoff round.

## Execution Budget

Core route:

```txt
Phase 8   4 rounds
Phase 9   4 rounds
Phase 10  4 rounds
Phase 11  5 rounds
Phase 12  4 rounds
Phase 13  4 rounds
Phase 14  2 rounds
Total    27 rounds
```

Superseded optional route:

```txt
Historical advanced gameplay track  4-6 rounds
Total with historical optional track: 31-33 rounds
```

## Round Contract

Every round must end in a useful, testable checkpoint.

At the start of each round:

1. Read the current phase section in `docs/post-mvp-development-plan.md`.
2. Read the relevant architecture sections in the original architecture guide.
3. Inspect current files before editing.
4. Identify the smallest coherent checkpoint for the round.

During implementation:

1. Keep Three.js code inside `src/runtime/three/**` unless a documented editor glue exception already exists.
2. Keep game/event/director/schema/data layers renderer-neutral.
3. Add or update schemas before data/runtime/editor usage.
4. Keep data edits command-backed when they are editor mutations.
5. Keep JSON DSL behavior registry-backed.
6. Do not introduce `eval`, `new Function`, raw script fields, or dynamic global function calls.

At the end of each round:

1. Run relevant targeted tests.
2. Run full validation unless the round is explicitly exploratory.
3. Run browser smoke when UI/runtime behavior changed.
4. Run architecture checks.
5. Update docs when behavior, limitations, commands, or data formats change.
6. Inspect `git status` and your diff.
7. Commit with a concise conventional message.
8. Push at the end of each phase, and after any high-risk fix.

## Standard Validation Commands

Prefer configured wrappers:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
```

Equivalent direct commands:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run validate-data
npm run test:smoke
```

If `Smoke.cmd` fails after Playwright passes because the wrapper performs a follow-up health check after Playwright shuts down its web server, start the configured dev server wrapper and rerun smoke:

```powershell
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Stop only the dev server started by the wrapper.

## Architecture Checks

Run these after runtime/editor/data changes:

```powershell
$paths = @('src\game','src\events','src\director','src\world','src\schemas','src\data','src\migrations') | Where-Object { Test-Path -LiteralPath $_ }
if ($paths.Count -gt 0) { rg 'from [''"]three[''"]|import \* as THREE|require\([''"]three[''"]\)|THREE\.' @paths }
rg 'eval\(|new Function|window\[' src data scripts tests
```

Expected result:

- no forbidden Three.js imports in semantic/data/schema layers
- no real dynamic-code execution

Test strings that assert rejection may match the second command, but every match must be manually reviewed.

## Registry And Data Validation Checks

When adding actions or conditions:

1. Add or update the Zod schema.
2. Register the behavior in the appropriate registry.
3. Add side-effect classification for actions.
4. Add tests proving schema and registry coverage match.
5. Add `validate-data` checks for project data usage.

Useful ad hoc checks:

```powershell
@'
import { ActionSchema } from './src/schemas/action.schema.ts';
import { createDefaultActionRegistry } from './src/events/actionRegistry.ts';
const registry = createDefaultActionRegistry();
const schemaTypes = ActionSchema.options.map((option) => option.shape.type.value).sort();
const missing = schemaTypes.filter((type) => !registry.has(type));
console.log(JSON.stringify({ schemaTypes, missing }, null, 2));
if (missing.length > 0) process.exit(1);
'@ | npx tsx -
```

```powershell
@'
import { createDefaultConditionRegistry } from './src/events/conditionRegistry.ts';
const registry = createDefaultConditionRegistry();
const expected = ['flag.equals','flag.exists','inventory.hasItem','quest.stateEquals','entity.stateEquals','distance.lessThan','custom.condition'];
const missing = expected.filter((type) => !registry.has(type));
console.log(JSON.stringify({ expected, missing }, null, 2));
if (missing.length > 0) process.exit(1);
'@ | npx tsx -
```

## Phase Gates

Do not move to the next phase until all phase-gate items pass.

### Phase 8 Gate

- Real GLB loading works for at least one model asset.
- Placeholder fallback still works.
- Animation clip playback and seek work when clips exist.
- No Three.js leakage outside runtime adapter.
- Browser smoke confirms nonblank asset-backed rendering.

### Phase 9 Gate

- Demo scene uses real asset paths.
- Demo data validates.
- Open-gate flow remains intact.
- The room, gate, switch, trigger helper, and camera framing are visually distinguishable.
- Debug/editor helpers are visually distinct from gameplay assets.
- Browser smoke covers visible demo entities, visual variety/nonblank rendering, and the timeline path.

### Phase 10 Gate

- Subtitle, sound, camera shot action, and transform animation effects are observable.
- Preview mode does not execute unsafe side effects.
- Timeline effect tests and browser smoke pass.

### Phase 11 Gate

- Editor shell layout is stable and intentionally designed.
- Edit, Play, and Preview modes are visually distinct.
- Common controls are easier to scan and use, with appropriate icon or icon+text treatment.
- Validation, dirty, save, and preview states are visible and consistent.
- Browser smoke covers redesigned shell interactions and catches layout regressions.

### Phase 12 Gate

- Common authoring tasks can be completed in UI without hand-editing JSON.
- Invalid editor data is blocked or clearly displayed.
- Undo/redo covers core data edits.
- Save/reload smoke passes.
- Save-time validation rejects invalid writes.
- Dirty state is reliable.
- Migration script exists and is tested.
- Asset/reference/registry checks remain green.

### Phase 13 Gate

- Expanded browser smoke covers selection, transform, save, event, timeline, and camera paths.
- Boundary checks are automated.
- Bundle/performance risk is resolved or documented.

### Phase 14 Gate

- Fresh checkout instructions work.
- README and developer docs cover setup, validation, assets, actions, conditions, timelines, and camera shots.
- Release checklist passes.

## Documentation Updates Required By Phase

Phase 8:

- Document GLB asset requirements and fallback behavior.

Phase 9:

- Document demo scene assets, visual presentation choices, helper layers, and interaction flow.

Phase 10:

- Document runtime effect behavior and side-effect classifications.

Phase 11:

- Document editor UI/UX conventions, layout rules, mode states, and status patterns.

Phase 12:

- Document authoring workflows, save validation, dirty state, and migration rules.

Phase 13:

- Document boundary checks and smoke test scope.

Phase 14:

- Update README and add release checklist.

## Suggested Commit Messages

Phase 8:

```txt
feat: load glb assets through three runtime
feat: bridge glb animation clips to runtime commands
test: smoke asset-backed viewport rendering
```

Phase 9:

```txt
feat: add asset-backed gate demo scene
feat: improve demo room lighting and helper layers
test: cover demo open-gate flow
```

Phase 10:

```txt
feat: render timeline subtitles and sound commands
feat: route camera and transform actions through director
```

Phase 11:

```txt
feat: redesign editor shell and mode controls
feat: polish editor panels and status states
```

Phase 12:

```txt
feat: improve component and event authoring forms
feat: enhance timeline and camera shot editing
feat: validate data before editor saves
feat: add data migration workflow
```

Phase 13:

```txt
test: expand editor browser smoke coverage
chore: automate architecture boundary checks
```

Phase 14:

```txt
docs: add release candidate setup and demo guide
```

## Final Completion Criteria

The post-MVP core goal is complete only when:

- Phase 8-14 gates pass.
- Full validation passes.
- Browser smoke passes.
- Data validation passes.
- Boundary checks pass.
- Git status is clean.
- All phase docs are updated.
- Final commits are pushed to `origin/main`.
