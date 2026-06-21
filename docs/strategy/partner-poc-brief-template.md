# Partner POC Brief Template

Status: Phase 21.5 template.
Date: 2026-06-21.

Use this template before starting any partner or external infrastructure POC. A POC brief must be approved before work enters Sinan mainline, and it must keep the POC smaller than a production integration.

## 1. POC Identity

- POC name:
- Partner or project:
- Related RFC:
- Sinan owner:
- Partner owner:
- Target phase:
- Baseline commit:
- Proposed adapter path:

Examples of proposed adapter paths:

```txt
src/assets/adapters/**
src/input/adapters/**
src/camera/adapters/**
src/ui/adapters/**
src/physics/adapters/**
src/audio/adapters/**
src/narrative/adapters/**
```

## 2. Objective

Describe the smallest useful result. The objective must be a report, deterministic fixture, dry-run package, headless snapshot, or small host slice. It must not be a broad runtime migration.

## 3. Source Of Truth Statement

State exactly which Sinan data, schemas, registries, or systems remain authoritative.

Example:

```txt
Sinan keeps source-of-truth ownership for data/events, data/timelines, action registries, and Director scheduling. The partner output is a dry-run package and report only.
```

## 4. Inputs

- Sinan fixture data:
- Partner artifact:
- External package or protocol:
- Browser or platform requirements:
- Required sample assets:

## 5. Outputs

- dry-run report:
- generated candidate files:
- diagnostics:
- contract test results:
- smoke evidence:
- compatibility matrix update:

## 6. Non-goals

List what the POC must not do.

- no runtime hard dependency
- no source-of-truth replacement
- no editor save or undo takeover
- no broad gameplay migration
- no unreviewed generated data writes
- no dependency installation unless explicitly approved

## 7. Contract Tests

Define deterministic checks before implementation:

- fixture name:
- expected input:
- expected output:
- expected error cases:
- expected fallback behavior:
- replay or snapshot requirement:

## 8. Dry-Run Requirement

If the POC can write files or change runtime behavior, it must first support dry-run mode.

Dry-run report must include:

- planned creates, updates, and deletes
- unresolved references
- warnings and blocking errors
- generated ownership markers
- fallback plan
- rollback notes

## 9. Smoke Requirement

Browser smoke or equivalent validation must prove the POC does not break normal Sinan workflows.

Record:

- command:
- viewport or fixture:
- expected visible state or log:
- failure diagnostics:
- whether the smoke is automated or manual:

## 10. Dependency And Compatibility Notes

Record:

- license:
- bundle impact:
- browser support:
- ESM/CJS behavior:
- WASM or worker requirements:
- security concerns:
- maintenance status:
- compatibility matrix row:

## 11. Fallback Plan

Define how Sinan behaves when the partner artifact, package, browser feature, or adapter is missing.

Fallback must not corrupt source data and must be testable.

## 12. Acceptance

The POC can be accepted only if:

- Source Of Truth ownership remains Sinan-owned.
- dry-run or deterministic fixture evidence exists.
- contract tests pass.
- smoke or equivalent validation passes.
- fallback behavior is documented.
- compatibility matrix is updated.
- removal plan is clear.
- known limitations are listed.
