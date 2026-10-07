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

## Compact hover stability (2026-09-30)
- Compact idle and compact hover share the derived `compactCanvas` at begin AND commit. This is the narrow exception to "shrink HWND to the current surface at rest"; never reintroduce target.width+8 for compact commits.
- Compute the canvas from the existing silhouette, CSS overshoot/reversal bound, available width and physical AA/stroke/rounding margin. It is not a universal 178x41 constant.
- A fixed canvas is NOT a rectangular hit target. Keep the current dilated silhouette during finite compact animation updates; SVG fill sensing must survive content replacement/inert.
- Compare actual physical HWND rectangles and skip SetWindowPos when unchanged. Map the silhouette using the actual retained client width and DPI.
- Preserve cancellation, ordered frame updates and closed-epoch rejection. Synchronous native commands stay on the existing UI thread; no new worker scheduler.
- `--hover-diagnostics` is opt-in, bounded and memory-only. Normal launches must not record pointer diagnostics. Test-only finite SendInput/sampling is not an application polling loop.
- Current explanation and evidence: `docs/HOVER-STABILITY-FIX.md` and `evidence/hover-fix-20260930/`.

## Click/close paint continuity (2026-09-30)
- `renderCanvas` now bounds all existing horizontal states and supersedes the older shrink-to-shell allocation policy. Keep HWND coordinates fixed during clicks, close and hover; display-environment changes can replan it.
- The render canvas is NOT an input rectangle. Keep animated silhouette regions, the physical AA margin and the finite previous/next-paint handoff.
- Present a new native surface only after its region is ready. CSS uses a temporary hidden measuring element so it follows the same handoff as GSAP; remove it on settle/cancel/unmount.
- A leave during collapse updates business hover but must not replay outgoing content. Enable compact micro-hover after the content transition settles.
- Recheck actual screen continuity as well as rAF/final dimensions. A high rAF rate alone did not catch the historical blank frame on HWND contraction.
- Current patch: `docs/CLICK-FLICKER-FIX.md`; evidence: `evidence/click-fix-20260930/`.

## Clinical PRD implementation (2026-10-04)
- `clinical.html` is the default; `--legacy` selects the preserved historical prototype. New clinical PRDs and `Dynamic-Island-UI-Spec.md` override old horizontal-only/received-ack rules only in the new module.
- Clinical source states are read-only. Never send acknowledgements, completion, dispatch, finance, prescribing or treatment writes from the new surface. `clinical:personal` controls only a personal timer.
- Simulator role/state controls belong to the standalone studio, not the island. Use synthetic data only. Source windows are explicitly simulated, version- and identity-guarded boundaries.
- New native layout uses the spec's safe fallback: stable bounded canvas plus state-boundary silhouette changes and content fading. No per-frame native geometry IPC. Do not describe the browser animation as native continuous morph validation.
- Generate tokens from the single documented JSON with `npm run tokens:clinical`. Typography is scoped to `.ci-anchor` so 200%/225% must change computed font sizes, not only the canvas.
- Clinical source runs on loopback 17322; legacy on 17321. Do not stop an unrelated or unverified process to free ports.
- Windows secondary WebViews inherit identical existing browser arguments when sharing the profile; normal launches never add a QA endpoint.
- Follow `docs/CLINICAL-IMPLEMENTATION.md`; use only fresh `evidence/clinical-20261004` results for this delivery. Figma quota prevented online pixel-level inspection; real OS lock/fullscreen hooks, production identity and clinical workflow integration remain outside the prototype.

## Clinical U-notch / continuous motion (2026-10-04, supersedes the clinical static fallback)
- The accepted default contour is the legacy inward-ear cubic U, 160x34 DIP at normal text scale. Do not restore the 180-wide external circular ears.
- Rich clinical content remains measured, scrollable and read-only. Hover never auto-expands clinical details.
- Use UI spec 1.1/generated tokens. Restore the finite 540ms width spring / monotone height and 340ms collapse; never scale text or replay exit on mouseleave.
- Ordinary transitions keep HWND fixed. Finite single-in-flight HRGN previous/next silhouette handoff is explicitly permitted; per-frame HWND resize, idle region updates and full-canvas hit targets remain forbidden.
- Protect epoch, sequence, completion and cleanup at both sides. Authorization changes remove sensitive DOM immediately, including during outgoing presentation.
- Fresh evidence belongs to evidence/clinical-motion-20261004. Native geometry cadence and actual screen continuity are separate tests.

SVG width/height/viewBox/path must have one animation owner. React declares only the initial size and must not replace the SVG viewport with target dimensions while the previously painted path is still present. Native screen capture caught transient collapse artifacts from that mismatch; the finite native regression samples viewport/surface equality as well as FPS.

## Windows UI/UX v1.0 (2026-10-06; latest clinical visual authority)
- User-authored `docs/Windows 灵动岛 UI UX 设计规范 v1.0.md` is immutable input. Generate CSS/adapter tokens from section 12; maintain its SHA256 in tokens. This supersedes the old 160x34/7px ear/540ms easing ONLY for the clinical module.
- S0 124x32 body + external 10-DIP ears, S1 268x36 with 124 central blank, Minimal 36, Alert 372x88, Rich 372x168, Stack 400x<=280. Keep source details in a scrollable secondary panel, not a crowded Rich.
- Shape motion is a bounded numerical spring, not sampled GSAP easing. Retarget position/velocity without reset. GSAP is for finite content opacity/blur/entry only. Do not let React write the animated SVG viewport.
- Keep the stable native canvas and ordered silhouette handoff. A separate nonactivating WS_EX_LAYERED|WS_EX_TRANSPARENT shadow is allowed; never expand the hit region for shadow pixels.
- Local control settings are not authorization. Clinical writes stay forbidden. Source importance may interrupt the personal tool, but never change its timer deadline or simulate clinical receipt.
- Same-size content changes must reveal and unlock the content; panel ownership resets on object/auth changes. Never count stale 15px/old-card accessibility tests as current compliance.
- Current implementation decisions and explicit deviations: `docs/UIUX-V1-IMPLEMENTATION.md`. Fresh evidence only: `evidence/uiux-final-20261006`. No commit/push without instruction.
