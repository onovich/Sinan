# RFC-005: Sinan Narrative / Inscape Bridge Boundary

> Status: Draft for Phase 21.5 contract gate
> Date: 2026-06-21
> Related strategy: `docs/strategy/external-infrastructure-cooperation-strategic-decision.md`
> Applicable partner: Inscape / external narrative authoring and host integration

---

## 1. Summary

Sinan may cooperate with Inscape as a narrative authoring, review, and import/export partner, but Sinan keeps engine ownership of narrative execution.

```txt
Sinan Narrative Contract
  events, actions, timelines, camera shots, asset refs, localization keys, validation

Inscape / External Narrative Tooling
  authoring graph, integration package, dry-run import report, diagnostics, review aids
```

The bridge is report-first and artifact-first. Inscape can produce structured packages and dry-run reports that Sinan validates, but it must not become a runtime dependency or replace Sinan's Event, Director, Timeline, CameraShot, asset, or localization contracts.

## 2. Background

Sinan already owns data-first gameplay semantics:

- `data/events/*.json`
- `data/timelines/*.json`
- `data/cameraShots/*.json`
- `data/prefabs/*.json`
- `data/levels/*.json`
- action and condition registries
- Director and Timeline sampling
- ReferenceResolver and validation reports

Inscape can help with narrative graph authoring, localization anchors, source locations, review diagnostics, and host integration packages. That value is useful only if the generated artifacts remain inspectable, removable, and validated by Sinan.

## 3. Goals

This RFC defines:

- Sinan narrative Source Of Truth ownership.
- The boundary between Inscape packages and Sinan runtime contracts.
- A dry-run bridge and report format for future POCs.
- Non-goals for runtime preview, bidirectional editing, and hard dependencies.
- Acceptance criteria for a removable narrative adapter.

## 4. Non-goals

This RFC does not:

- Implement an Inscape importer.
- Add an Inscape runtime dependency.
- Add bidirectional live editing between Sinan and Inscape.
- Replace Sinan EventSystem, DirectorSystem, Timeline sampling, CameraShot data, or registries.
- Let external narrative graph IDs become stable Sinan runtime IDs without explicit import mapping.
- Move editor save, undo, or project ownership into an external tool.

## 5. Source Of Truth

Sinan source-of-truth data remains:

```txt
data/events/*.json
data/timelines/*.json
data/cameraShots/*.json
data/prefabs/*.json
data/levels/*.json
data/assets.manifest.json
```

Rules:

- Sinan public IDs remain stable and are validated by Sinan schemas.
- External narrative node IDs are import-time references, not runtime authority.
- Generated artifacts must be marked as generated and traceable to source locations.
- Imported actions and conditions must resolve through Sinan registries.
- Localization keys must be explicit references, not embedded arbitrary runtime code.
- Dry-run reports are evidence; they are not authoritative project data.

## 6. Contract Concepts

### 6.1 NarrativeIntegrationPackage

A portable artifact produced by Inscape or another external narrative authoring tool.

Responsibilities:

- describe candidate narrative graph nodes
- list source locations
- list localization anchors
- list asset, camera, timeline, and event references
- provide import metadata and version information

Limits:

- It is not executed directly by Sinan runtime.
- It cannot contain arbitrary JavaScript or callbacks.
- It cannot bypass Sinan schema validation.

### 6.2 NarrativeDryRunReport

A deterministic report generated before any write to Sinan data.

Required sections:

- candidate creates, updates, and deletes
- unresolved references
- localization key status
- generated file ownership
- registry action and condition resolution
- warnings and blocking errors
- rollback notes

### 6.3 NarrativeImportPlan

A Sinan-owned plan that maps external package entries into Sinan data changes.

Rules:

- The import plan must be reviewable before apply.
- Writes must be explicit and scoped.
- Existing handwritten files must not be overwritten without a generated ownership marker.
- The plan must support dry-run mode.

### 6.4 HostBridgeCandidate

A future optional bridge surface for host integration review.

Rules:

- It may expose diagnostics and candidate mappings.
- It must not expose direct mutation of Sinan runtime systems.
- It must not require Sinan runtime to load Inscape core.

## 7. Boundary

Recommended flow:

```txt
Inscape authoring graph
  -> NarrativeIntegrationPackage
  -> Sinan dry-run parser
  -> NarrativeDryRunReport
  -> reviewed NarrativeImportPlan
  -> Sinan data writes
  -> Sinan validation
  -> Sinan runtime execution
```

Sinan keeps:

- schema validation
- import approval
- generated ownership policy
- Event and Timeline source-of-truth
- CameraShot source-of-truth
- asset and localization reference validation
- runtime execution
- fallback and diagnostics policy

Inscape or another partner may provide:

- authoring graph tooling
- package export
- source location metadata
- localization anchor suggestions
- dry-run diagnostics
- review UI or audit material

## 8. Inscape POC Plan

### POC-1: Integration Package Parser And Report

No runtime change. Sinan reads a sample integration package and outputs a dry-run report.

Acceptance:

- no official `data/**` files are changed
- unresolved references are reported
- localization anchors are reported
- generated ownership is explicit
- existing validation still passes

### POC-2: Import Plan For A Small Narrative Slice

Sinan produces a reviewed import plan for one small prompt, subtitle, or objective slice.

Acceptance:

- the plan maps into existing Event, Timeline, CameraShot, and asset contracts
- no arbitrary script strings are introduced
- the plan can be rejected without side effects
- fallback behavior is documented for missing assets or localization keys

### POC-3: Generated Artifact Apply

Only after POC-1 and POC-2 pass, Sinan may apply generated artifacts in a branch.

Acceptance:

- generated files are clearly marked
- manual files are not overwritten accidentally
- data validation passes
- the adapter can be removed without breaking handwritten source data

### POC-4: Host Bridge Audit

Optional future work. Inscape may expose an audit package for source locations, diagnostics, and mapping review.

Acceptance:

- audit data is read-only from Sinan's perspective
- no runtime hard dependency is added
- no bidirectional live editing is required

## 9. Acceptance Criteria

A narrative bridge can enter Sinan planning only if:

- Sinan remains the Source Of Truth for runtime narrative execution.
- The bridge is removable.
- A dry-run report exists before writes.
- Generated ownership is explicit.
- Import plans are reviewable.
- Localization, asset, action, timeline, and camera references are validated.
- Missing references have deterministic diagnostics and fallback policy.
- No runtime dependency on Inscape core is required.
- No arbitrary script strings or callbacks are imported.

## 10. Rejected Approaches

Rejected:

- executing an external narrative graph directly in Sinan runtime
- making Inscape node IDs the canonical Sinan IDs
- writing generated data without a dry-run report
- replacing Sinan Timeline or Director scheduling
- importing arbitrary JavaScript callbacks
- requiring bidirectional editor sync as the first integration

## 11. Open Questions For Future Implementation

- What generated ownership marker should Sinan use across JSON files?
- Which localization file format should be introduced when runtime localization starts?
- Should narrative import reports become part of `npm run validate-data` or a separate command?
- Which fixture should represent the first narrative bridge POC?
