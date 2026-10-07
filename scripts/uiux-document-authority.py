from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'README.md';s=p.read_text(encoding='utf8')
note='''> **2026-10-06 当前视觉规范：** `docs/Windows 灵动岛 UI UX 设计规范 v1.0.md`。临床默认入口现在使用 S0/S1/S2/S4/S5/S6、Notch/Floating、数值弹簧与单一语义色；历史 160×34/540ms 说明仅用于旧版对照。解释、边界和未验收项见 `docs/UIUX-V1-IMPLEMENTATION.md`；本轮证据在 `evidence/uiux-final-20261006`。临床业务仍为只读模拟来源。

'''
if note not in s:s=s.replace('\n\n','\n\n'+note,1)
p.write_text(s,encoding='utf8')
p=root/'AGENTS.md';s=p.read_text(encoding='utf8');s+='''
## Windows UI/UX v1.0 (2026-10-06; latest clinical visual authority)
- User-authored `docs/Windows 灵动岛 UI UX 设计规范 v1.0.md` is immutable input. Generate CSS/adapter tokens from section 12; maintain its SHA256 in tokens. This supersedes the old 160x34/7px ear/540ms easing ONLY for the clinical module.
- S0 124x32 body + external 10-DIP ears, S1 268x36 with 124 central blank, Minimal 36, Alert 372x88, Rich 372x168, Stack 400x<=280. Keep source details in a scrollable secondary panel, not a crowded Rich.
- Shape motion is a bounded numerical spring, not sampled GSAP easing. Retarget position/velocity without reset. GSAP is for finite content opacity/blur/entry only. Do not let React write the animated SVG viewport.
- Keep the stable native canvas and ordered silhouette handoff. A separate nonactivating WS_EX_LAYERED|WS_EX_TRANSPARENT shadow is allowed; never expand the hit region for shadow pixels.
- Local control settings are not authorization. Clinical writes stay forbidden. Source importance may interrupt the personal tool, but never change its timer deadline or simulate clinical receipt.
- Same-size content changes must reveal and unlock the content; panel ownership resets on object/auth changes. Never count stale 15px/old-card accessibility tests as current compliance.
- Current implementation decisions and explicit deviations: `docs/UIUX-V1-IMPLEMENTATION.md`. Fresh evidence only: `evidence/uiux-final-20261006`. No commit/push without instruction.
''';p.write_text(s,encoding='utf8')
p=root/'docs/Dynamic-Island-UI-Spec.md';s=p.read_text(encoding='utf8');note='> **历史规范说明（2026-10-06）：** 当前临床界面已按用户新增的 `Windows 灵动岛 UI UX 设计规范 v1.0.md` 实现。本文保留上一轮设计记录，不再作为当前视觉 token 生成源。差异解释见 `UIUX-V1-IMPLEMENTATION.md`。\n\n'
if note not in s:s=note+s
p.write_text(s,encoding='utf8')
print('Documentation points to the new immutable UI/UX specification')
