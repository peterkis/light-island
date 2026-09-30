# 候选核验与取舍（2026-09-26）

| 候选 | 本次核验 | 原型取舍 |
|---|---|---|
| souverth/dynamic-island-4win | README 标注 Tauri 2 + React/TS；GPLv3；媒体、系统状态、通知、文件等功能较多；自述30ms鼠标恢复循环 | 参考问题清单，不复制源码，不从综合桌面工具裁剪 |
| warpirate/pillar-dynamic-island-for-windows | Tauri2 + React + Rust，MIT；媒体/计时/AI助手等多功能 | 参考胶囊层级与桌面集成，未把演示页面当作真机验证 |
| iamdhakrey/RustyIsland | Rust/Tauri + React/TS，MIT；系统监控为主 | 状态划分可参考，但不是医院消息底座 |
| nithinpjohn/Dynamic-island-notifications | Next.js 15 + Motion；README称MIT；仅最近3条可见 | 不引入Next.js，不沿用3条队列上限；参考展开节奏 |
| Skiper Dynamic Island | 未核验具体版本/授权，不复制组件 | 不作为交付依赖 |

本次采用新建小型 Tauri2 + React/TS + Vite 骨架；仅引入 Motion mini，不引入完整 React Motion 布局运行时。另有CSS引擎对照。不是对所有候选仓库的二进制基准测试。

## 官方 API 依据
- https://v2.tauri.app/reference/config/ ：transparent/decorations/focus/alwaysOnTop/skipTaskbar/shadow。
- https://v2.tauri.app/learn/window-customization/ ：窗口定制。
- https://v2.tauri.app/learn/inter-process-communication/ ：Tauri command/events。
- https://motion.dev/docs/animate ：mini 基于原生浏览器动画 API，官方标称约2.3kB，但应用最终体积以构建结果为准。
- https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowrgn ：region 基于窗口坐标，成功后系统拥有 HRGN；失败由调用方释放。
- https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow ：SW_SHOWNOACTIVATE。

## 仓库来源
https://github.com/souverth/dynamic-island-4win
https://github.com/warpirate/pillar-dynamic-island-for-windows
https://github.com/iamdhakrey/RustyIsland
https://github.com/nithinpjohn/Dynamic-island-notifications

没有引用仓库的“3MB”“零CPU”“全平台支持”等自述作为本原型实测结论。未借用 GPL 项目实现。部署许可最终应由院方结合实际分发模式复核。
