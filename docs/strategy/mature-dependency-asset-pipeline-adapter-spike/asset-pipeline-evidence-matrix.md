# AssetPipelineAdapter Evidence Matrix

Date: 2026-06-22
Branch: `codex/mature-dependency-asset-pipeline-adapter-spike`

| Requirement | Evidence | Result |
| --- | --- | --- |
| Contract types | `asset-pipeline-types.ts` and tests | PASS |
| Request normalization | `asset-pipeline-normalizer.ts` path/profile/variant/budget tests | PASS |
| Path boundary | absolute, drive-qualified, UNC, URL-like, empty, and traversal path tests | PASS |
| Budget classification | pass/warning/fail tests | PASS |
| Raw fallback | `raw-asset-pass-through-adapter.ts` tests | PASS |
| glTF Transform inspect | `gltf-asset-pipeline-adapter.ts` inspect tests | PASS |
| Generated artifact write/re-read | temp-dir GLB build/re-read test | PASS |
| Manifest patch | normalized manifest patch entries and conflict tests | PASS |
| Rebuild reproducibility | `asset-pipeline-rebuild.ts` and adapter rebuild tests | PASS |
| Aggregate smoke | `smoke:asset-pipeline` | PASS |
| Boundary guard | aggregate import and artifact guard | PASS |
| Mainline approval | explicitly not granted | NOT APPROVED |

## Validation Snapshot

- `check`: PASS, 29 test files / 123 tests.
- `smoke:asset-pipeline`: PASS.
- `git diff --check`: PASS with LF/CRLF warnings only from existing generated JSON traces.
