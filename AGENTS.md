# Samewave Island prototype

## Boundaries
- This is a synthetic Windows Tauri 2 + React + TypeScript prototype, not a clinical alert delivery system.
- No real patient data, hospital endpoints, clinical interpretation, or automatic treatment decisions.
- `received` is not `treated`. Success is shown only after the server returns the matching event revision.
- Keep clinical alerts individually identifiable. Only routine, non-acknowledgement updates may coalesce.
- A bounded in-memory queue is not durable delivery. Do not describe this prototype as lossless or production-ready.

## Implementation
- Native `island` window and optional `studio` window share one Rust WebSocket connection.
- Only the `island` window uses native window-region synchronization. Browser and studio previews must not modify native geometry.
- Windows region ownership transfers to the OS only after successful `SetWindowRgn`.
- Incoming notifications must not acquire keyboard focus. Explicit user clicks may acquire focus.
- Do not introduce perpetual mouse-position polling, an idle FPS loop, or full-window blur.
- Motion mini and CSS are comparison paths. Do not replace them with a large animation runtime without a measured reason.
- Use configured logical geometry; test physical coordinates separately at each DPI.

## Commands and evidence
- `npm run build`, `npm test`, `npm run test:e2e`, `npm run desktop:build`.
- Playwright uses the installed Chrome with an isolated test profile.
- `--qa-cdp` explicitly enables local port 9223 for this prototype only. Never use it for normal launches.
- Native QA scripts live in `scripts/`; results belong in `evidence/`.
- Report runtime frame samples as rAF cadence, not guaranteed DWM-presented frames.
- Measure the full application/WebView2 process tree. Do not quote the Rust process alone as total memory.
- Never attach QA tools to a user's existing browser profile or an unrelated debugging port.

## Horizontal capsule update (2026-09-26)
- All capsule modes stay 56 DIP high with radius 28 DIP. Animate width only around a fixed horizontal center; never restore downward card expansion.
- Dock the visible capsule to the primary monitor top edge with zero gap. Legacy top-offset settings must not undock it.
- The HRGN is a conservative outer clip with a 2-physical-pixel antialias fringe, not the visible curve. Never clip the rounded WebView surface at its exact edge.
- Keep message center and thread navigation horizontal. Preserve acknowledgement, privacy, priority and click-through behavior.
- Current geometry evidence is evidence/HORIZONTAL-UPDATE.md; earlier validation files describe the historical vertical prototype.

## U-notch and motion update (2026-09-30)
- This update supersedes the old 56-DIP idle rule only in notch mode. U-notch idle 160x34, hover +10x3, notification maximum height 56. Legacy capsule stays 56 high.
- Use GSAP/useGSAP with independently retained outgoing content; no large bounce, no scaling text, no infinite hover loops.
- Native HWND uses a bounded thin envelope during transitions, not per-frame resizing. At rest shrink and apply the dilated SVG silhouette. Document that transparent areas inside the temporary envelope can intercept clicks during morphing.
- The default primary-screen/top-zero rule, acknowledgement semantics and privacy still apply.
- Tailwind utilities are opt-in; do not enable global preflight over the existing studio.
- React StrictMode is enabled; dispose listeners and every transition context. Superseded native epochs must never resize the active transition.
