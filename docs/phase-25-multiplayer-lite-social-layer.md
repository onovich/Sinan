# Phase 25 Multiplayer-lite Social Layer Design Lock

Date: 2026-06-22
Status: Phase 25 implementation lock for executor round 25.1.

## Baseline

Phase 25 starts from the accepted Phase 24 baseline:

- Phase 24 accepted commit: `c21cd57 docs: align phase 24 final report commit evidence`
- Phase 25 guide commit: `9f2833e docs: add phase 25 multiplayer-lite guide`
- Active guide: `docs/phase-25-multiplayer-lite-social-layer-goal-mode-execution-guide.md`

The Phase 24 Delivery Showcase remains the regression baseline. Showcase Mode,
delivery job state, route and target feedback, completion HUD, editor delivery
inspection, low-end route diagnostics, and delivery smoke must stay green while
social features are added.

## Scope Lock

Phase 25 adds a local shared-space prototype with these pieces:

- Data-first avatar, emote, stamp, social preset, and network message contracts.
- A renderer-neutral social runtime state for remote players, poses, emotes,
  stamps, stale remotes, disconnects, room limits, rate limits, and invalid
  message diagnostics.
- A deterministic local remote-player simulator before any WebSocket transport.
- Runtime bridge methods that expose social state to the browser runtime without
  putting per-frame simulation or message validation in React.
- Three.js remote avatar and stamp feedback visuals under `src/runtime/three/**`.
- Minimal slow-state editor/showcase HUD diagnostics for remote count, room
  state, active stamp count, invalid messages, and rate-limit status.
- A local WebSocket room prototype behind adapter or smoke boundaries.

Phase 25 does not add production networking, matchmaking, authentication,
persistence, moderation, reconnect recovery, NAT traversal, encryption, text
chat, voice chat, friend lists, parties, trading, economy, authoritative server
gameplay, Physics/Rapier, external InputFlow/ViewRig/LudoWeave/Inscape adapters,
production Runtime UI framework work, Audio runtime work, or Phase 26 release
hardening.

## Current Gap Audit

The current project has no committed social runtime, avatar/emote/stamp source
data, network message schema, or WebSocket transport. Existing patterns to reuse:

- `data/**/*.json` is the source of truth.
- Zod schemas in `src/schemas/**` define validated contracts.
- `src/data/ReferenceResolver.ts` validates cross-file references.
- Delivery runtime state already stays separate from source data.
- `EngineSession` bridges renderer-neutral state into `WebRuntime`.
- Runtime-specific visuals and disposal belong in `src/runtime/three/**`.
- `EditorApp.tsx` and `Viewport.tsx` may expose slow diagnostics and smoke hooks
  but must not own per-frame simulation, transport, or message validation.

## Data Contract Decisions

Round 25.2 should add a renderer-neutral social catalog. The intended shape is:

- Avatar definitions with stable `id`, `displayName`, `shortLabel`, color tokens,
  optional fixture scale, low-end visibility behavior, and optional first-party
  asset references only when they already pass asset validation.
- Emote definitions with stable `id`, display label, icon token, duration,
  cooldown, and fallback behavior.
- Stamp definitions with stable `id`, linked `emoteId`, label, lifetime, color,
  height/radius hints, priority, and low-end suppression behavior.
- A small social preset or fixture that maps local simulated remote players to
  avatar/emote/stamp ids without storing transport ids, socket ids, DOM ids, or
  Three objects.

Preferred file layout:

- `src/schemas/social.schema.ts`
- `data/social/avatars.json`
- `data/social/emotes.json`
- `data/social/stamps.json`
- `data/social/presets.json`

If implementation inspection shows the repository has a stronger local pattern,
the code may choose an equivalent layout, but the data must remain JSON,
renderer-neutral, transport-neutral, and schema validated.

## Network Message Contract Decisions

Round 25.3 should add Sinan-owned message contracts before transport. The message
schema must cover:

- `join`
- `pose`
- `emote`
- `stamp`
- `snapshot`
- `disconnect`
- `serverTime`
- `error`
- unknown or invalid payload diagnostics

The runtime must safely reject invalid join, pose, emote, stamp, snapshot,
disconnect, and unknown messages without mutating source data or corrupting
delivery state. Room-full and rate-limited outcomes are diagnostics/state, not
production service behavior.

Preferred placement:

- Contract and parser helpers: `src/network/socialMessages.ts` or
  `src/schemas/socialNetworkMessage.schema.ts`
- Adapter interfaces and diagnostics: `src/network/**`
- Concrete local WebSocket prototype: `src/network/adapters/websocket/**` or
  `scripts/**` if it is smoke-only

Semantic layers must not import concrete WebSocket server/client implementation.

## Runtime Decisions

Social semantics should live in first-party renderer-neutral code such as
`src/game/social/**`. It should own:

- Remote player state and room state.
- Pose snapshots and stale/disconnect transitions.
- Emote/stamp event queues.
- Message application and invalid-message accounting.
- Room size and message rate limits.
- Deterministic simulator inputs for up to ten remotes.
- Diagnostics for runtime, HUD, tests, and smoke.

`EngineSession` should bridge the current social snapshot into `WebRuntime`.
`WebRuntime` should expose optional social methods and diagnostics in
`src/runtime/RuntimeTypes.ts`. React can render slow social HUD and inspection
text from the bridged diagnostics; it must not own runtime simulation.

## Three Runtime Decisions

Remote avatar and stamp visuals belong only under `src/runtime/three/**`.
Renderer objects, materials, geometry, derived transforms, and disposal counters
must not leak into data, schemas, world, events, director, delivery, social
message contracts, or network adapters.

The Three implementation should support:

- Stable remote ids.
- Pose update and stale/disconnect visibility.
- Ten simulated remote avatars.
- Stamp lifetime and low-end suppression.
- Deterministic diagnostics for smoke when pixels are timing-sensitive.
- Disposal tests for avatar and stamp objects.

## WebSocket Prototype Decisions

The WebSocket prototype is local and replaceable. It comes after the simulator
and message schemas. If a package is needed, it must be added only in the
WebSocket round, scoped as dev/prototype infrastructure, documented in the final
report, and kept out of semantic layers. Browser/server failure must produce a
safe fallback diagnostic rather than breaking the delivery showcase.

No production room service, authentication, persistence, deployment, text chat,
or authoritative gameplay should appear in Phase 25.

## Validation Lock

Per-round validation follows the guide. The final Phase 25 gate must include:

- `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Validate.cmd`
- `C:\Users\Administrator\.codex\skills\project-ops-workflow\scripts\ops\Smoke.cmd`
- `git diff --check`
- Targeted schema/runtime/Three/editor/network tests added by the phase.
- Data validation, asset report, and boundary checks when the touched surface
  requires them.

Smoke and tests must prove ten simulated remotes, at least one emote/stamp
feedback path, invalid-message rejection, room/rate diagnostics, low-end
diagnostics where practical, and preservation of Phase 24 delivery flow.

## Round Map

- Round 25.1 locks this design and baseline audit.
- Round 25.2 adds avatar/emote/stamp data and schema validation.
- Round 25.3 adds network message contracts and invalid-message parsing.
- Round 25.4 adds renderer-neutral social runtime state.
- Round 25.5 adds deterministic local remote-player simulation.
- Round 25.6 bridges social state through `EngineSession` and `WebRuntime`.
- Round 25.7 renders remote avatars in Three runtime.
- Round 25.8 renders emote/stamp feedback in Three runtime.
- Round 25.9 adds slow-state showcase/editor affordances.
- Round 25.10 adds the local WebSocket room prototype.
- Round 25.11 integrates the multiplayer-lite flow.
- Round 25.12 adds smoke and perf evidence.
- Rounds 25.13 through 25.15 remain buffers for Phase 25-only fixes.
- Round 25.16 writes the final report, runs full validation/smoke, pushes, and
  reports back to planner/checker.
