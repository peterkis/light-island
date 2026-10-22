# Samewave Island prototype

## Always

- Synthetic Windows Tauri 2 + React + TypeScript prototype. Use synthetic data; clinical sources stay read-only. No hospital endpoints, treatment decisions, clinical acknowledgements, or production/lossless delivery claims.
- Preserve user-authored design inputs, historical evidence and unrelated work. Write new evidence to a new task directory. Publish, merge or delete only within the user's authorized scope.
- `samewave-island.exe` owns personal tools, native windows and source readers; `samewave-workbench.exe` owns simulation and independent preview. Keep their state, connections and lifecycles independent.
- Keep the stable HWND, single animated SVG owner, ordered silhouette handoff and immediate authorization/reading cleanup. Notifications must preserve keyboard focus.

## Read when relevant

| Task | Read before editing |
| --- | --- |
| Ownership, protocol, timers, source/report lifecycle, launch or packaging | [Architecture and state](docs/agents/architecture.md), then [app split](docs/APP-SPLIT-20261014.md) |
| UI, motion, SVG, native geometry, focus or click-through | [UI and native invariants](docs/agents/ui-native.md) |
| Tests, performance, browser/native QA or evidence | [Validation](docs/agents/validation.md) |
| Commit, push, PR review, merge, process or disk cleanup | [Publication and cleanup](docs/agents/publication-cleanup.md) |
| Review | [CODING_STANDARDS.md](CODING_STANDARDS.md) |
| Prior incidents or document selection | [Retrospective index](docs/retrospectives/README.md), [document index](docs/README.md) |

## Build and verify

- Install with `npm ci`; use [package.json](package.json) for per-app development/build commands.
- `npm run check` runs guidance/input checks, unit tests, the Node protocol fixture check, both frontend builds/typechecks and bundle boundaries.
- `npm run test:e2e` uses installed Chrome with an isolated profile; `npm run desktop:build` builds both EXEs into `dist/desktop`.
- Select checks from [validation](docs/agents/validation.md) for the changed layer. Native changes also need both applicable Rust checks and owned native QA. Report failures, skipped checks and device limits explicitly.

## Code Review Rules

- Flag stale reports after deletion/revision/revocation/disconnect, preview/desktop state leakage, and source operations that change a personal timer deadline. Check all reader entry points.
- Flag native geometry/focus regressions and motion-policy changes without evidence for the effective mode. Browser/rAF success does not establish desktop continuity or full-device acceptance.
- Apply [review standards](CODING_STANDARDS.md) for cross-file judgment; mechanical checks belong in `npm run check`/CI.
