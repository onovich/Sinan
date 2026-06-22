# Navigation Source-Of-Truth And Artifact Policy

Date: 2026-06-22
Status: proposed policy for RFC review

## Policy Summary

Sinan-owned authored data remains the source-of-truth for navigation intent. Generated navmesh artifacts are rebuildable outputs, never canonical project truth.

This policy applies to any future `NavigationAdapter`, including recast-navigation, Recast WASM, waypoint graph, grid, or alternative implementations.

## Canonical Source-Of-Truth

Future authored `data/**/*.json` may own only package-agnostic navigation intent:

- navigation region ids;
- source geometry references by Sinan ids;
- agent profile ids;
- area ids and semantic tags;
- layer or zone ids;
- include/exclude masks expressed as Sinan-owned labels;
- fallback preference such as `none`, `waypoint-graph`, `grid`, or `navmesh`;
- validation expectations such as required region coverage or allowed missing-navigation behavior.

Canonical data must reference scene, level, prefab, or collision geometry through Sinan ids. It must not embed dependency-specific coordinates, buffers, handles, binary blobs, memory pointers, or package configuration objects.

## Agent Profiles

An agent profile is a Sinan-owned semantic policy. It may include:

- profile id;
- radius class;
- height class;
- max slope class;
- step or climb class;
- area costs by Sinan area id;
- permitted layers;
- fallback mode.

Profile values should be authored as stable gameplay/editor semantics. A future adapter may translate those semantics into package-specific build settings, but the translated settings are not canonical.

## Area Semantics

Area ids describe Sinan-authored meaning, not dependency internals. Examples:

- `walkable`
- `blocked`
- `slow`
- `jump-link`
- `doorway`
- `cinematic-only`
- `npc-only`

Any future adapter may map these ids into candidate-owned area indices or flags during generation. That mapping is derived output and must be reproducible from the Sinan-owned policy.

## Generated Navmesh Artifact Policy

Generated navmesh artifacts may exist only as rebuildable output. They must carry enough metadata to prove provenance and staleness:

- artifact id;
- region id;
- source geometry ids;
- source geometry hash;
- agent profile id;
- build profile id;
- adapter id;
- adapter version;
- generated artifact path;
- generated-at timestamp or deterministic smoke marker;
- diagnostics;
- stale marker;
- committed flag;
- rebuildable flag.

Generated artifacts may be local development files, CI artifacts, or future offline pipeline outputs. They are not the authored navigation model.

## Forbidden Canonical Content

Canonical Sinan data must not contain:

- Recast or recast-navigation objects;
- WASM handles, heap offsets, or memory ownership fields;
- Detour query objects;
- binary navmesh blobs as source truth;
- candidate package version strings as data semantics;
- package-specific area bitmasks;
- package-specific build config structures;
- dependency-owned path result objects;
- browser chunk paths or WASM asset paths.

## Stale, Missing, Incompatible, And Deleted Artifacts

Future validation should report these states without package-specific fields:

| State | Meaning | Required behavior |
| --- | --- | --- |
| `missing-artifact` | Authored navigation intent exists, but generated output is absent. | Use configured fallback and emit diagnostic. |
| `stale-artifact` | Source geometry, agent profile, or area policy changed after generation. | Refuse authoritative path queries or mark them degraded. |
| `incompatible-artifact` | Artifact metadata does not match adapter, schema, or platform expectations. | Ignore artifact, use fallback, and require rebuild. |
| `deleted-artifact` | Artifact was removed during cleanup or branch change. | Treat as missing, not as authored data loss. |
| `artifact-blocked` | Bundle, WASM, license, or policy gate blocks artifact consumption. | Keep navigation unavailable and preserve scene/editor operation. |

## Retention And Cleanup

Generated navmesh artifacts must be easy to delete and regenerate. A future implementation guide must decide whether artifacts are:

- always uncommitted local outputs;
- committed small deterministic fixtures for tests only;
- CI-uploaded artifacts;
- offline build outputs with explicit size and review gates.

No generated navmesh artifact may be committed as gameplay truth without a separate architecture decision.

## Source Change Boundary

If future `data/**/*.json` changes affect navigation, the change should be expressed as authored intent or geometry references. The generated artifact should change only as a derived result.

This keeps the exit strategy simple: remove the adapter binding and generated artifacts while preserving authored levels and navigation intent.
