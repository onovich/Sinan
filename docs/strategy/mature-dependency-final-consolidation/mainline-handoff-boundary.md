# Mainline Handoff Boundary

Date: 2026-06-22
Status: final consolidation handoff boundary

## Consumers

This packet is intended for four consumer roles:

| Consumer | May use this packet for | Must not use this packet for |
| --- | --- | --- |
| Chief architect / planner | Decide whether a future adapter-specific guide is worth writing. | Directly authorizing package or runtime changes without a separate guide. |
| Deputy architect | Translate accepted evidence into one narrow future mainline proposal. | Treating accepted evidence as dependency selection or implementation approval. |
| Mainline executor | Understand which mature-dependency facts are already validated. | Editing `src/**`, `data/**`, `tests/**`, `public/**`, package manifests, or configs from this handoff alone. |
| Future submodule executor | Reuse evidence patterns, smoke expectations, and fallback language. | Broadening the isolated spike lane into Phase 20/21 work. |

## Mainline Boundary

Sinan mainline Phase 20 and Phase 21 remain governed by their own approved guides, scope rules, and validation commands. This final consolidation packet is not a Phase 20 or Phase 21 work item.

This packet may inform future planning, but it does not authorize:

- runtime/editor implementation;
- root package or lockfile edits;
- Vite, TypeScript, Vitest, or Playwright config edits;
- changes to canonical authored `data/**/*.json`;
- changes to mainline `src/**`, `tests/**`, or `public/**`;
- dependency imports in Sinan production code;
- generated artifacts as source of truth;
- skipping any mainline phase gate.

## How A Future Implementation Guide Should Be Requested

A future adapter implementation must start from a separate architect-approved guide. That guide should name exactly one adapter and define:

- the target branch and base branch;
- allowed committed paths;
- forbidden paths;
- package/config authorization, if any;
- adapter contract and fallback behavior;
- browser/WASM/bundle policy when relevant;
- data source-of-truth boundaries;
- generated artifact policy;
- validation commands;
- rollback or exit strategy;
- checker acceptance criteria.

The implementation guide should cite this packet as evidence, not as a substitute for scope approval.

## Safe Consumption Pattern

Use this sequence when turning consolidation evidence into work:

```txt
final consolidation packet
  -> planner selects exactly one adapter candidate
  -> architect writes an adapter-specific implementation guide
  -> executor implements only that guide's allowed paths
  -> checker validates scope, behavior, artifact hygiene, and architecture
```

Do not collapse those steps into one mainline task.

## Debug Self-Check For Consumers

Before using this packet, confirm:

- the desired adapter status is still current in `adapter-compatibility-matrix.md`;
- the final evidence report exists and is cited;
- the future guide names a fallback and a rollback path;
- the guide can be validated by commands, not only prose;
- no work begins from `hold-for-showcase`, `dev-only`, or `accept-for-contract` status alone.

## Architecture Self-Check For Consumers

The correct architecture is adapter-owned dependency isolation behind Sinan-owned contracts. The packet is valid only while mainline data remains data-first, Three.js remains isolated to runtime/editor boundaries, generated artifacts remain derived outputs, and dependency behavior remains replaceable behind adapters.
