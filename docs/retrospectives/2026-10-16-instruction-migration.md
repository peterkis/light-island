# AGENTS.md 精简依据与迁移对照

本轮用户明确要求复盘并精简项目 AGENTS；只调整本仓库，不修改全局 AGENTS、Codex 配置、用户 skills 或记忆。原始版本可从 `b57c8f1:AGENTS.md` 读取，无需复制一份自动生效的旧指令。

## 官方依据与本项目选择

OpenAI 建议根文件短、准确、包含实际命令和完成条件；复杂规划/架构/审查信息可引用专项 Markdown，重复错误才形成新的持久指导。[官方最佳实践](https://learn.chatgpt.com/guides/best-practices#make-guidance-reusable-with-agentsmd)

官方还说明全局到项目/当前目录的指导层级、override 优先顺序、默认 32 KiB 指导预算和就近 review rules。专项普通 Markdown **不会因存在而自动加载**，因此根文件必须明确“什么任务先读什么”。本项目多个根目录协作面交叉，没有创建多层重复 AGENTS 或 override，也没有调大用户配置。[官方 AGENTS 指南](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

| 选择 | 作用 | 不应误解为 |
| --- | --- | --- |
| 根 AGENTS 留 Always、条件入口、检查、Code Review Rules | 每次任务都需要的边界前置，详细规则按需读 | 所有外部文档已自动进入上下文 |
| 4 KiB 根文件预算 | 拦截事故日志重新常驻膨胀；实际前后值见本轮回执 | OpenAI 官方强制的 4 KiB 上限 |
| 四个专题指南 | 收拢跨日期的当前约束与读取条件 | 创建新的视觉数值权威或改写原规范 |
| CODING_STANDARDS | 单独承载跨入口、状态所有权、证据和审查前提的判断 | 用文字替代可确定执行的检查 |
| 只读导航/输入检查与 CI | 防止失效链接、错误命令、设计输入漂移；运行已有单测/类型/打包检查 | 已完成远端 CI、Rust/原生屏幕或全设备验收 |
| 复盘与源台账 | 保存原因、失败和历史适用范围 | 再造一个需要每次整本读的指令文件 |

## 原十三节逐项去向

原根文件为 **14,131 bytes / 110 行**，下表以改动前实际磁盘内容为基准。没有删掉硬边界来换取字数。

| 原节 | 当前入口 | 历史/覆盖处理 |
| --- | --- | --- |
| Boundaries | 根 Always + [架构](../agents/architecture.md) | 合成/只读/不宣称持久可靠保留；received/回执及合并仅对 legacy 适用 |
| Implementation | 根 Always + [UI/原生](../agents/ui-native.md)、[架构](../agents/architecture.md) | 两 EXE、源 reader 连接、HRGN 所有权、焦点、无轮询、DPI 保留；比较动画路径不引入大 runtime 的要求归性能/legacy判断 |
| Commands and evidence | 根 Build + [验证](../agents/validation.md) | 实际命令仍查 package；独立 QA profile/端口、rAF、完整进程树、禁止接入无关端点保留 |
| Horizontal capsule update | [UI/原生 legacy 节](../agents/ui-native.md) → HORIZONTAL/hover/click 历史材料 | 56 DIP / radius 28 和横向导航只限旧模块；主屏 top-zero、2 物理 px AA、回执/隐私/优先级/穿透仍有效 |
| U-notch and motion update | UI/原生的当前/legacy 两节 | 160×34/+10×3 只限旧模块；shrink-at-rest 被 renderCanvas 覆盖。Tailwind opt-in、StrictMode/outgoing 清理、临时区域透明像素 caveat 保留 |
| Compact hover stability | UI/原生 legacy 节 → hover 说明 | 推导 canvas、begin/commit 一致、非固定常数、fill sensing、实际 rect、UI 线程、epoch 及 diagnostics 保留 |
| Click/close paint continuity | UI/原生 HWND 节与 legacy 节 → click 说明 | 稳定 HWND 继续有效；CSS 临时测量清理、leave 不重播退出、微 hover 时机、真实屏幕连续性保留 |
| Clinical PRD implementation | 架构、UI/原生、验证 | 默认 clinical/legacy、只读个人工具、来源权限、token/文字缩放、端口/WebView 参数保留；静态 fallback 与旧 evidence 只作历史，不再固定本轮输出到 20261004 |
| Clinical U-notch / continuous motion（含独立 SVG owner 段） | 根 Always + UI/原生 | 有限有序 HRGN 与即时失权清理保留；160×34/7px/540ms 不覆盖 v1.0；viewport/path 单一 owner 仍关键 |
| Windows UI/UX v1.0 | UI/原生 → 原始规范 + 既有实现解释 | 当前几何、弹簧、同尺寸内容、panel ownership、独立阴影、个人 deadline 保留；移除旧固定 evidence 输出和无授权发布的重复句，根按当前授权处理 |
| Motion restoration | UI/原生动效节 | 有效信号、枚举持久化、CSS/JS 一致、通用 .96 与 reader 不缩放、变化位 200ms 保留；补当前保守启动/查询失败/focus 刷新 |
| UI/UX visual refinement | UI/原生 → refinement 说明 | 空 S0 cursor-only、键盘 focus、首次 show chrome 刷新、AA、QA 背景清理及正常启动无端点保留 |
| Separate workbench and island | 根职责/路由 + 架构 → app split | 显式目标、timer/偏好所有权、v2/session、断连清理、本地服务、reader/preview 原生边界和两 EXE 产物保留；原 evidence 目录仅指历史 |

旧固定输出目录中的“fresh evidence only”改为通用的新任务目录约束；既有证据依然保留原字节。Figma 配额、当时 Windows 动画 OFF 和历史审批拒绝属于来源与未测范围，不再当作永久环境事实。只在维护 legacy 时读取旧形态规则。

## 确定性检查与人工判断的分界

[check-project-guidance.mjs](../../scripts/check-project-guidance.mjs) 只读检查当前指令/索引/复盘中的本地文件与锚点、npm 脚本引用、根字节预算以及三份不可变输入。固定哈希从已确认的起点登记，不能跟着输入修改自动更新。负例测试使用自有临时目录，不编辑设计原文。

CI 串接已有 `npm test`、`test:protocol`、`build`/typecheck、bundle checks；不新增通用 lint 框架、无关 runtime 依赖或全局 hook。不会自动重写有历史含义的旧报告链接。物理 focus、轮廓、报告擦除、实验串扰和性能收益不能仅靠文档正则判断，仍用现有行为回归和按层验证。

## 后续维护完成条件

新增经验先查 [复盘索引](README.md)。有确定性复现就补现有测试；需要跨路径判断就更新标准/专题；只在每次任务都必须知道时修改根 Always。更新导航后运行 `npm run instructions:check`；改检查器还跑其单测和 typecheck，发布候选跑 `npm run check`。原规范、历史证据及无关源码/EXE 保护结果见 [本轮回执](../../evidence/retro-20261016/RESULTS.json)。
