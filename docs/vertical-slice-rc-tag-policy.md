# Vertical Slice RC Tag Policy

Date: 2026-06-22
Phase: 26.5 RC Release Packaging And Baseline Tagging

This policy records the internal release-candidate tag for the local Sinan vertical slice. It is an internal baseline tag for demos, validation, and future branch points. It is not a public production release or hosted deployment.

## Tag

- Tag name: `vertical-slice-rc-2026-06-22`
- Tag type: annotated git tag
- Message: `Sinan vertical slice internal RC baseline 2026-06-22`
- Target: the final validated Phase 26.5 commit after release notes, demo script, validation evidence, tag policy, and final report are committed and pushed.

## No-overwrite Rule

Before creating the tag, check both local and remote state:

```powershell
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

If either command returns an existing tag, do not delete, move, recreate, force-push, or overwrite it. Stop the packaging phase and report BLOCKED with the exact local or remote tag evidence.

## Creation And Push

Create and push the tag only after the final Phase 26.5 validation gate passes and the final validated commit is pushed to `origin/main`:

```powershell
git tag -a vertical-slice-rc-2026-06-22 -m "Sinan vertical slice internal RC baseline 2026-06-22"
git push origin vertical-slice-rc-2026-06-22
```

After pushing, confirm the local and remote tag:

```powershell
git tag --list vertical-slice-rc-2026-06-22
git ls-remote --tags origin vertical-slice-rc-2026-06-22
```

Record the final target commit, tag object evidence, and push result in `docs/phase-26-5-rc-release-packaging-and-baseline-tagging-final-report.md`.

## Retagging Policy

Do not retag the same name for ordinary corrections. If the RC package needs a follow-up after the tag is pushed, prefer one of these options:

- create a new scoped repair guide and a new tag name with an explicit date or suffix;
- keep the existing tag as historical evidence and document the follow-up commit separately;
- ask the planner/checker for a new tag decision before any manual tag surgery.

Force-pushing tags, deleting remote tags, or moving `vertical-slice-rc-2026-06-22` is outside Phase 26.5 scope.

## Scope Boundaries

The tag certifies only the internal local RC baseline covered by repository validation:

- `Validate.cmd`
- `Smoke.cmd`
- `npm run perf:smoke`
- `npm run report-assets`
- `git diff --check`

It does not certify production backend, auth, persistence, hosted deployment, production multiplayer, text chat, voice chat, mobile hardware, Physics/Rapier, external adapters, production Runtime UI, Audio runtime, or broad engine expansion.
