# 同频 · Samewave Island / 原型 0.1

> **2026-10-06 当前视觉规范：** `docs/Windows 灵动岛 UI UX 设计规范 v1.0.md`。临床默认入口现在使用 S0/S1/S2/S4/S5/S6、Notch/Floating、数值弹簧与单一语义色；历史 160×34/540ms 说明仅用于旧版对照。解释、边界和未验收项见 `docs/UIUX-V1-IMPLEMENTATION.md`；本轮证据在 `evidence/uiux-final-20261006`。临床业务仍为只读模拟来源。

> **当前默认入口（2026-10-04）：临床协作原型。** 根据 `docs/prd` 三份文档与新 UI 规范实现个人番茄钟、8 个核心来源场景和 6 个研究扩展场景。临床状态只读，来源按钮打开经过对象/版本校验的本机模拟来源窗口，不写临床确认。
>
> 双击 `start-prototype.cmd`；开发使用 `npm run dev:clinical` 后打开本机 `http://127.0.0.1:1420/clinical.html`。临床模拟源为 17322，原有 17321 旧版源保留。`--legacy --studio` 可运行旧版对照，但需先退出当前单实例客户端。
>
> 实现、原生动效安全降级及未验收边界见 [CLINICAL-IMPLEMENTATION](docs/CLINICAL-IMPLEMENTATION.md)；本轮真实命令和证据在 `evidence/clinical-20261004/`。以下旧版说明保留作历史参考，不代表新临床模式仍有“确认收到”操作。

医院数字化协作空间的独立消息入口。**全部为模拟消息，不连接临床系统。**

## 当前版本：U 形刘海与分层动效（2026-09-30）
默认待机 160×34 DIP、悬停 170×37、通知为横向 56 DIP 高短条。始终贴主显示器顶部正中，保留上方反向小圆角。可切换“等高胶囊”对照上版体验；不是向下展开的消息面板。
GSAP 弹簧是默认外壳路径，另有 CSS 外壳对照；内容退出、替换与分层入场由统一时间线管理，文字不缩放。
详见 `docs/NOTCH-MOTION-UPDATE.md`；本轮实测以 `evidence/NOTCH-MOTION-VALIDATION.md` 及其原始 JSON/日志为准。旧 `VALIDATION.md` 和 `HORIZONTAL-UPDATE.md` 仅为历史记录。

## 直接体验
双击 `start-prototype.cmd`，启动原生消息条与可交互试验台。先把鼠标移到屏幕顶部中央观察微扩，再发送“报告就绪”“检验危急值”，或“播放一次协作场景”。
右侧可切换 GSAP/CSS 外壳、U 形刘海/等高胶囊、三种主题、减少动态、隐私及专注模式。收起不代表确认收到，确认收到不代表处置完成。
关闭试验台后消息条继续运行；托盘可重新打开、收起或退出。同项目全部停止可双击 `stop-prototype.cmd`。启动脚本不修改全局执行策略、不注册开机启动、不安装后台服务。

## 开发与测试
`npm ci` 安装锁定依赖。浏览器开发 `npm run dev:all`，入口 `http://127.0.0.1:1420`。
原生开发：一终端 `npm run demo:server`，另一个 `npm run desktop:dev`（自动启动 Vite）；已有本项目模拟源时复用，不重复绑定端口。不要同时运行 dev:all 与 desktop:dev。
`npm run build` 前端构建；`npm test` 规则/几何测试；`npm run test:e2e` 浏览器回归；`npm run desktop:build` 生成 Windows Release EXE，不打安装包。
构建输出：`src-tauri/target/release/samewave-island.exe`。重新编译之前退出正在运行的 Release 程序。Vite 排除 src-tauri/evidence/test-results 监听；Tailwind 只扫描明确的新组件，避免扫描 Rust 构建产物。

## 消息与安全边界
- 三种主题共用状态机；普通提示约 6.5 秒收起，悬停暂停；专注模式抑制普通消息自动展开，危急事件保留待确认。
- id+revision 去重、匹配版本回执；普通非确认消息按 source+groupKey 合并，不同危急事件不能合并。
- 点击确认后等待服务端回执，断线/超时保留失败状态。不会用本地动画伪造成功；关联脉络使用明确 threadId，不猜测患者关系。
- 默认隐私遮罩，主动查看的也是预先脱敏模拟数据；本地只保存外观偏好，不保存消息正文。
- Rust WebSocket→Tauri event→React；原生试验台与消息条共享一个 Rust 连接。浏览器预览使用独立适配器。
- 原生窗口动态收紧到外接范围，过渡期间使用有限的窄包围区域，结束后恢复轮廓穿透；该过渡区域不宣称逐像素穿透。
- 不轮询鼠标，不持续统计帧率，不启用全屏背景模糊。原生扩展不主动切换当前输入焦点。

## 代码入口
`src/lib/domain.ts` 消息规则；`src/hooks/useIsland.ts` 业务生命周期；`useMorph.ts` 显示状态、GSAP 与窗口调度；`src/lib/geometry.ts` 统一曲线；`NotchSurface.tsx` 外壳；`Island.tsx` 横向内容；`Studio.tsx` 按需加载的试验台；`src-tauri/src/notch_window.rs` 原生几何；`lib.rs` 消息通道与托盘；`server/demo-server.mjs` 模拟源。

## 尚未验收的生产能力
Windows 10 真机、多屏热拔插、真实 OS DPI 矩阵、锁屏/投屏隐私、WSS 鉴权证书、SSO/设备绑定、持久化补拉、临床处置升级、审计、真实 HIS/LIS/PACS 深链接、签名安装器均未作为本轮交付。
浏览器 DPR 回归不是混合 DPI 真机验收；rAF 帧节奏不是 DWM 实際呈现的完整测量。内存应统计原生进程及全部 WebView2 子进程，不只看 Rust EXE。
客户端内存队列上限 200，满载显式告警；模拟源最多保留 400 事件，重启清空。**不是可靠临床通知系统，不得输入真实患者信息或用于医疗决策。**

## QA
`--qa-cdp` 仅在显式本机验收时开放 9223，正常启动不开放。测试只能连接本项目窗口和独立浏览器配置，不能接入个人浏览器会话。
`scripts/qa-notch-native.mjs`：原生形态、抗锯齿、回执、中断及短时帧节奏；`qa-notch-windows.py`：仅合成测试窗口的真实鼠标穿透与焦点检查。
Esc 和 Ctrl+Shift+I 仅在应用窗口内生效，不是系统级全局热键。本轮没有复制候选仓库代码、推送 GitHub、修改其他项目或系统安全策略。

## Hover stability patch (2026-09-30)
Compact idle/hover now share a geometry- and DPI-derived native canvas at both begin and commit. A common canvas does not mean a rectangular hit target: finite compact morphs retain the live dilated silhouette. Stable SVG sensing survives content replacement/inert; a cancellable leave check and guarded 120ms peek preserve interaction.
See `docs/HOVER-STABILITY-FIX.md` and `evidence/hover-fix-20260930/` for this patch's baseline, evidence, commands and explicitly untested OS-DPI combinations. Earlier validation files remain historical.
Use `--qa-cdp --hover-diagnostics` only for a deliberate native audit, or `?hoverDiagnostics=1` in a browser. Normal launches disable diagnostics. New regressions: `tests/hover-geometry.test.ts`, `tests/hover-regression.spec.ts`, `scripts/qa-hover-native.mjs`, `scripts/audit-hover-evidence.py`, `scripts/qa-hover-epochs.mjs`. Existing native scripts accept `ISLAND_QA_OUTPUT` to avoid replacing historical evidence.

## 点击展开与关闭闪烁修复（2026-09-30）
当前采用从所有现有横向状态推导的薄型渲染画布，点击、关闭与 hover 不再改变 HWND 原点或尺寸。可点击区域仍跟随实际外壳轮廓，不能把画布大小理解为透明挡板。这个策略替代上文历史版本中的“结束后收紧 HWND”。
关闭中的真实 leave 不再重播内容退场；GSAP/CSS 共用轮廓准备后再呈现的原生交接。详见 `docs/CLICK-FLICKER-FIX.md` 和本轮独立的 `evidence/click-fix-20260930/`，不要用旧帧率或静态尺寸记录替代本轮中间帧验收。
新增回归：`tests/click-transition.spec.ts`；渲染采样：`scripts/qa-click-render.mjs`（本应用 DOM 激活，不是物理鼠标）；受限真实输入回归：`scripts/qa-click-native.mjs`（只允许命中本应用后点击）。


## 2026-10-04 · U 型与原生连续形变恢复

此节按用户最新选择替代临床模块的圆弧外耳形状与瞬时几何降级。默认视觉总宽高恢复为 160×34 DIP；7 DIP 耳角收在总宽内部，下方双三次曲线与旧版 U 形一致。保留 400 DIP 基线的临床可滚动详情、200% / 225% 文字适配，未将新业务内容退回旧单行通知。

展开使用旧版 ζ=.84、ω=13 归一化轻弹簧（宽度540ms，高度单调），收回340ms；内容短暂退出、按最终布局进入，不缩放文字、不加全屏模糊。隐私/权限收紧立即删除敏感 DOM，不为淡出保留患者快照。默认悬停仍不自动展开或改变外壳。

原生 HWND 画布在普通转换中保持固定。仅在有限动画期允许单在途、最新帧合并的 HRGN 交接，原生准备前/后相邻轮廓并集后才绘制，最终收敛为真实轮廓；不是将整个画布设为可点击。旧 epoch、帧序号、关闭阶段及卸载均受保护。此为对原“所有逐帧区域 IPC 禁止”的最小例外，绝不允许逐帧 resize HWND 或空闲轮询。

数值与路径唯一权威：`docs/Dynamic-Island-UI-Spec.md` 1.1 的第3/4/9/10章；执行 `npm run tokens:clinical` 生成。当前验证记录目录 `evidence/clinical-motion-20261004/`，不得引用旧的静态路径结果作为本轮动效通过证据。Figma 再次读取被 Starter 额度拒绝，本轮未修改远端画板。
