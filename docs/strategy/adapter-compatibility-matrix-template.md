# Adapter Compatibility Matrix Template

Status: Phase 21.5 template.
Date: 2026-06-21.

Use this template to compare partner projects and mature dependencies before any adapter moves into a future implementation phase.

## 1. Matrix

| Area | Candidate | RFC | Adapter Path | Source Of Truth Owner | Contract Tests | Dry-Run / Report | Smoke | Fallback | License | Bundle | Browser Support | Compatibility Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Assets | Indirection | RFC-001 | `src/assets/adapters/**` | Sinan asset manifest and ReferenceResolver | required | required | required | required | pending | pending | pending | hold |
| Input | InputFlow | RFC-002 | `src/input/adapters/**` | Sinan InputAction/InputContext/InputSnapshot | required | trace/replay required | required | required | pending | pending | pending | hold |
| Camera | ViewRig | RFC-004 | `src/camera/adapters/**` | Sinan CameraShot and RuntimeCameraPose | required | trace required | required | required | pending | pending | pending | hold |
| Runtime UI | LudoWeave | RFC-003 | `src/ui/adapters/**` | Sinan RuntimeUIViewModel and UIActionRef | required | snapshot required | required | required | pending | pending | pending | hold |
| Narrative | Inscape | RFC-005 | `src/narrative/adapters/**` | Sinan Event/Timeline/Camera/Asset/Localization contracts | required | dry-run required | optional | required | pending | pending | pending | hold |
| Physics | Rapier or equivalent | RFC-006 | `src/physics/adapters/**` | Sinan collider/layer/trigger/query policy | required | fixture required | required | required | pending | pending | pending | hold |
| Audio | Web Audio or equivalent | RFC-007 | `src/audio/adapters/**` | Sinan AudioCue/mix/timeline/unlock policy | required | command log required | required | required | pending | pending | pending | hold |

## 2. Decision Values

- `accept-for-adapter-spike`: may be used in a later implementation guide.
- `hold`: useful, but missing RFC, contract tests, dry-run, smoke, compatibility, or fallback evidence.
- `reject`: does not fit Sinan boundary or has unacceptable license, bundle, browser support, or maintenance risk.
- `blocked`: cannot be evaluated because environment, package, or partner artifact is unavailable.

## 3. Required Evidence

Each row must eventually link to:

- RFC.
- POC brief.
- mature dependency evaluation if a package is involved.
- contract tests.
- dry-run report or deterministic fixture.
- browser smoke or equivalent validation.
- fallback evidence.
- license and bundle review.
- browser support notes.

## 4. Compatibility Notes

Compatibility is not a yes/no statement. It must identify which Sinan phase, data contract, adapter path, browser baseline, and dependency version were tested.

Minimum note format:

```txt
Candidate:
Sinan phase:
Baseline commit:
Adapter path:
Tested version:
Browsers:
Contract tests:
Smoke:
Fallback:
Known limitations:
Decision:
```

## 5. Promotion Rule

A candidate cannot move from `hold` to `accept-for-adapter-spike` unless all of these are true:

- Source Of Truth remains Sinan-owned.
- adapter path is defined.
- license is acceptable.
- bundle impact is measured or bounded.
- browser support is acceptable for the target phase.
- contract tests exist.
- dry-run, report, trace, snapshot, or fixture exists.
- smoke or equivalent validation exists.
- fallback behavior is proven.
- removal plan is documented.
