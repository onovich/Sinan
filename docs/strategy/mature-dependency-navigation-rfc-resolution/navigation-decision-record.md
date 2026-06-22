# NavigationAdapter Decision Record

Date: 2026-06-22
Status: resolved for checker review
Starting matrix status: `hold-for-rfc`
Resolved matrix status: `hold-for-showcase`

## Decision Question

Should the mature dependency program move `NavigationAdapter` beyond `hold-for-rfc`, and if so, what exact boundary and future gates must exist before any navigation implementation spike?

## Current Evidence

- RFC-013 intentionally holds navigation until Sinan owns navigation data, query vocabulary, generated artifact policy, fallback behavior, and WASM/browser validation gates.
- The recast-navigation spike proved candidate value in isolation, including Node import/init, navmesh generation, query behavior, and Vite production build.
- The recast spike also recorded unresolved risk: large WASM-compatible chunk, browser smoke gap at the time, source-of-truth ambiguity, and the need to compare simpler fallback strategies.
- The browser smoke harness now runs real Playwright Chromium for accepted candidates, but navigation remains `POLICY-SKIP` under RFC-013.
- RFC-011 requires explicit dependency approval, bundle budgets, browser smoke, import guards, and fallback before any WASM/native dependency enters mainline.

## Decision Frame

Sinan can safely define a navigation boundary now. Sinan cannot safely implement navigation yet.

The decision packet should answer:

- what navigation intent belongs in future authored `data/**/*.json`;
- what a future adapter may build or query;
- how generated navmesh artifacts remain rebuildable output;
- which fallback modes preserve scene/editor operation without navigation;
- which browser, WASM, bundle, and showcase gates must pass before implementation;
- whether the compatibility matrix should remain `hold-for-rfc` or move to `hold-for-showcase`.

## Current Leaning

The selected outcome is `hold-for-showcase`: RFC-014 defines the boundary, but implementation must still wait for a concrete playable or editor showcase that actually needs navigation.

## Non-Decisions

This record does not:

- approve `recast-navigation` as a root dependency;
- choose recast over a waypoint, grid, or alternative navigation implementation;
- authorize generated navmesh assets as canonical source truth;
- authorize runtime AI or director behavior that assumes navigation exists.

## Evidence Gaps To Resolve In This Packet

- future canonical source schema and ownership;
- generated navmesh artifact retention and cleanup;
- fallback status vocabulary;
- browser/WASM smoke requirements;
- bundle budget and dynamic import gates;
- matrix wording that blocks implementation until showcase acceptance exists.
