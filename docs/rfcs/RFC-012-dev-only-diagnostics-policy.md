# RFC-012: Dev-Only Diagnostics Policy

Date: 2026-06-21
Status: `dev-only`
Related matrix row: `DiagnosticsAdapter` / Spector.js

## Background And Evidence

The mature dependency spike identified Spector.js as useful for GPU and frame-capture diagnostics. That usefulness is explicitly development-only. It does not create a production runtime dependency, gameplay semantic, data schema, or user-facing feature commitment.

This RFC defines how dev-only diagnostics can exist without crossing Sinan architecture boundaries.

## Sinan-Owned Contract

Sinan owns:

- Diagnostic capability registry and feature flags.
- Debug UI commands that request capture, inspect availability, and show normalized diagnostic status.
- Production exclusion policy.
- Diagnostic event vocabulary for unavailable, loading, capture started, capture complete, capture failed, and production disabled.
- Privacy and artifact-retention rules for local diagnostic captures.

The contract exposes only Sinan diagnostic states to editor panels and logs.

## Candidate-Owned Responsibilities

Spector.js or another diagnostic tool may own:

- Dynamic import and initialization.
- Browser/WebGL capture internals.
- Tool-specific capture UI or object model while contained in a dev-only adapter.
- Disposal of tool resources.

The candidate cannot become a required runtime dependency.

## Forbidden Leakage

The following are forbidden:

- No production import or production behavior path for Spector.js.
- No Spector object, capture id, WebGL internals, or tool-specific state in JSON, save data, editor store, runtime world state, or migrations.
- No gameplay condition or timeline action that depends on diagnostics.
- No root dependency approval without RFC-011 production exclusion validation.

## Adapter Inputs And Outputs

Inputs:

- `DiagnosticsConfig` with dev flag, capture permissions, artifact policy, and diagnostics level.
- `DiagnosticsCommand` with capture start, capture stop, availability query, and cleanup artifact requests.

Outputs:

- `DiagnosticsStatus` with unavailable, loading, ready, capturing, complete, failed, or production-disabled.
- `DiagnosticsArtifact` with local-only metadata, capture time, size, and retention class.
- `DiagnosticsMessage` normalized for editor display.

## Lifecycle, Errors, Diagnostics, And Fallback

Lifecycle states:

- `production-disabled`: diagnostics are intentionally absent.
- `unavailable`: browser or renderer cannot support the tool.
- `loading`: dynamic import is in progress.
- `ready`: capture can be requested.
- `capturing`: capture is active.
- `failed`: capture could not finish.
- `disposed`: dev-only tool is released.

Fallback:

When diagnostics are unavailable, the editor should show unavailable state and continue normal operation. Production builds must behave as if the feature does not exist.

## Validation Strategy

Validation must include:

- Contract tests for diagnostic status normalization.
- Dev build smoke for dynamic import, capture command, failure path, and disposal.
- Production build or static guard proving Spector.js is absent from production behavior.
- `rg` guard proving tool imports are limited to dev-only diagnostics files.

## Future Implementation Gate

Future implementation may proceed only when:

- RFC-012 is accepted.
- RFC-011 records the dependency as `dev-only`.
- Browser smoke proves dynamic import and capture failure handling.
- Production exclusion is validated before merge.

## Hold, Reject, And Blocker Rules

Hold if production exclusion cannot be proven.
Reject if diagnostics must become gameplay or data semantics.
Block if the tool cannot be lazy loaded or disabled in production.
