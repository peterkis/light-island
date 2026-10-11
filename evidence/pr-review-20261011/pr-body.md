This PR exposes the complete lab-reader and UI/UX continuation introduced by 7f9947a for retrospective review. The implementation is already on main, so the temporary base is pinned to its predecessor 9609ecf. After review and fixes, merge this PR and fast-forward main to the merge commit, preserving existing history.

The clinical island adds a synthetic read-only report flow: notification, summary, timed reading, privacy masking and local clearing, without watermark or clinical writes. It also includes S2 separation, dismissal/undo, compact marquee, bounded button feedback, accessibility fixes and window-scoped native reply routing.

Validation recorded for the submitted implementation: 191 TypeScript tests, 7 Rust tests, frontend/Release builds and the final 12 report scenarios passed. The final full 72-test suite was not rerun. Main-island native acceptance was blocked by Windows BUSY=2; device/DWM and other incomplete checks remain explicitly documented. Historical failures and immutable user inputs are preserved.

Authority and implementation: AGENTS.md, docs/LAB-READER-IMPLEMENTATION.md, docs/UIUX-V1-CONTINUATION.md and the immutable specifications in docs/protype. Fresh review evidence and any fixes will be recorded under evidence/pr-review-20261011 on drive D.

Review gate: request @codex review on each changed head, resolve substantive findings, verify the exact head and applicable checks before merge. Temporary review branches will then be removed after main contains the reviewed merge.
