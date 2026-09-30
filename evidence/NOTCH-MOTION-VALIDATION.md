# U-notch motion validation / 2026-09-30

## Current build
Release EXE SHA256: `FBE0A6C41B54BC1122E1FBB7107EA2E8BC01C3B85BAB97EFE383C9C5D6485E59`. Size: 4297728 bytes.
Normal startup PID: 19544. QA port open: False.
Tauri Release build succeeded; TypeScript/Vite build succeeded. Domain + geometry: 41 unit tests passed. Browser E2E: 22 passed (including DPR 1.25/1.5/2 contexts).

## Native WebView2 observations
Three themes x idle/expanded: alpha fringe retained, 0 antialias pixels clipped by native region. Primary top=0 and horizontal centering passed.
Idle CSS: 160x34 DIP. Hover: 170x37. Expanded: 880x56. Corresponding native windows at the tested 100% scale: 168x38 and 888x60.
Native receipt roundtrip and latest-state interruption receipt: passed. Idle DOM mutations in a bounded 900ms observation: 0. Runtime page errors: 0.

| Shell path | rAF samples | Mean fps | P95 interval | >25ms |
| --- | ---: | ---: | ---: | ---: |
| gsap | 480 | 60.00 | 17.10 ms | 0 |
| css | 479 | 60.01 | 17.10 ms | 0 |

These are rAF timing samples, NOT DWM-presented frame measurements. No claim of universal 60fps. Max native CSS-center deviation stayed below 1 logical pixel; top gap stayed 0.

## Real Windows input
Synthetic witness button received the real mouse click through a transparent notch corner. The island remained interactive inside. Routine and critical arrivals preserved the synthetic witness foreground window. No unrelated desktop input or capture was required.

## Normal-launch idle resources
Sample: 5.19s. Full native application plus all discovered WebView2 descendants; excludes Node demo server, build tools and Studio (Studio opened after sampling).
Private working set: **92.21 MiB**. Private committed bytes: 150.89 MiB. Summed working sets: 367.11 MiB (may double-count shared pages).
Machine-normalized CPU sample: 0%. A short sample does not prove permanently zero CPU or exclude future memory growth/GPU memory.

## Explicit limitations
- The native hardware run is Windows 11 at the current monitor scale. Browser DPR tests are not Windows 10 or mixed-OS-DPI hardware acceptance.
- During a morph, a bounded thin transition envelope may intercept clicks within its transparent area. At rest the silhouette region restores click-through.
- No full desktop acrylic blur, broad native drop shadow, authenticated clinical channel, durable delivery, lock-screen policy or production signing has been added.
- One intermediate E2E run failed because Vite watched a Rust executable being linked (EBUSY). Watch exclusions and explicit Tailwind source scoping fixed the cause; the complete 22-test suite was rerun. Failed-run evidence is preserved.

## Raw evidence
`notch-final-build.log`, `notch-build-unit.log`, `notch-final-e2e.log`, `notch-e2e-watcher-failure.log`, `notch-native-validation.json`, `notch-native-window-checks.json`, `notch-process-tree.json`, `notch-delivery.json`.
Screens: `notch-native-desktop.png`, `notch-native-ink-compact.png`, `notch-native-ink-expanded.png`, `notch-browser-dpr-1.25.png`, `notch-browser-dpr-1.5.png`, `notch-browser-dpr-2.png`.
Implementation and timing notes: `../docs/NOTCH-MOTION-UPDATE.md`.

Normal native Studio was captured from its own HWND with PrintWindow after the debug session ended; `notch-native-studio.png` confirms the production lazy-loaded interface rendered. `notch-live-windows.json` records the owned visible windows.
