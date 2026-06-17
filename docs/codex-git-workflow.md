<!-- codex-project-git-workflow: initialized -->
<!-- initialized-at: 2026-06-17 13:24:00 +08:00 -->

# Codex Git Workflow

Initialization status: initialized
Project: Sinan Scene Director
Repository root: D:\LabProjects\Sinan
Machine config: `.codex/project-git-workflow.json`
Skill: project-git-workflow

Treat this document and the machine config as the source of truth for this repository's Codex git workflow.

## Global Wrappers

Run these from the repository root:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Validate.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Commit.cmd -Message "commit message"
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "commit message"
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Push.cmd
```

## Status

```powershell
git -c safe.directory=D:/LabProjects/Sinan status --short --branch
```

## Validation

The git wrapper validates commits with the Phase 0 package checks:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test
npm run validate-data
npm run migrate-data -- --check
```

`validate-data` currently performs JSON parse, Zod schema validation, duplicate id checks, asset URL/file checks, registry coverage checks, and reference checks for prefabs, assets, timelines, camera shots, and events where those data directories exist. `migrate-data -- --check` verifies repository data is already at the current schema version without writing.

## Staging Policy

All changes.

Inspect status before staging. Preserve unrelated user changes unless the user explicitly asks to include them.

## Commit

Use the global wrapper's built-in git commit after staging according to policy. Prefer concise conventional commit messages unless the user specifies another message.

## Push

```powershell
git -c safe.directory=D:/LabProjects/Sinan push -u origin HEAD
```

## Docs And TODO

Keep `docs/development-plan.md` and the architecture guide aligned when project scope changes.

## Safety And Branch Policy

Do not force-push or run destructive git commands unless the user explicitly requests the exact operation.
