# AGENTS.md

## Project Context

- Product and architecture source docs live in `docs/Sinan_Scene_Director_研发方案与架构指南.md`.
- Before implementing a module, read the corresponding architecture section and keep the data-first boundaries intact.
- `data/**/*.json` is the source of truth for levels, prefabs, events, timelines, camera shots, and related game semantics.
- Keep Three.js isolated to `src/runtime/three/**` and thin editor viewport glue. Do not import `three` from `src/game`, `src/events`, `src/director`, `src/world`, `src/schemas`, `src/data`, or `src/migrations`.
- React owns editor/HUD/panel slow state only. Per-frame transforms, animation state, physics, AI, timeline sampling, and camera sampling belong in world/runtime/director systems.
- JSON DSL must not use `eval`, arbitrary script strings, or unregistered function calls. Actions and conditions go through schemas plus registries.
- Current repo stage is documentation/bootstrap only. Update `.codex/project-ops-workflow.json` after Phase 0 adds package scripts.

<!-- codex-init-flow: initialized -->

## Codex Project Workflow

Initialization status: initialized
Initialized at: 2026-06-17 13:19:23 +08:00
Project root: D:\LabProjects\Sinan
Initial git remote: git@github.com:onovich/Sinan.git

Use these workflow skills for routine Codex work in this project:

- `init-flow`: initialize or refresh this project document and workflow configuration.
- `project-git-workflow` / `git-flow`: use for git status, validation, commit, push, stash, ignore, and guarded discard operations.
- `project-ops-workflow` / `ops-flow`: use for environment checks, dependencies, build, test, lint, format, typecheck, dev server, smoke, package, and release dry-run operations.

Prefer the configured wrappers instead of guessing project commands:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "commit message" -Paths path\to\file,other\file
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Stash.cmd -StashMessage "reason"
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\DiscardPaths.cmd -ConfirmDangerous -Paths path\to\file
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StartDevServer.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd
C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\StopDevServer.cmd
```

Project-specific workflow configs live at:

- `.codex/project-git-workflow.json`
- `.codex/project-ops-workflow.json`

Do not silently fall back to generic git/build/test behavior when those configs exist. Update this section and the workflow configs deliberately when project policy changes.

<!-- /codex-init-flow -->
