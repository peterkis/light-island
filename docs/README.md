# 项目文档索引

根 [AGENTS.md](../AGENTS.md) 只保留常驻约束和任务入口。此处区分当前依据、按需规则和历史证据；日期较早的实现报告不能自动覆盖当前行为。

## 按任务查找

| 任务 | 入口 |
| --- | --- |
| 应用职责、协议、个人状态、阅读失效 | [状态与架构](agents/architecture.md) → [两应用拆分](APP-SPLIT-20261014.md) |
| UI、动效、透明窗口、轮廓、焦点 | [UI 与原生约束](agents/ui-native.md) |
| 检查、回归、性能、证据口径 | [验证指南](agents/validation.md) → [脚本入口](../scripts/README.md) |
| 提交、审查、合并、分支/缓存清理 | [发布与清理](agents/publication-cleanup.md) |
| 代码审查的跨文件判断 | [CODING_STANDARDS.md](../CODING_STANDARDS.md) |
| 常见错误、经验、原始会话定位 | [复盘主题索引](retrospectives/README.md) → [跨会话深度复盘](retrospectives/2026-10-16-cross-session.md) |
| AGENTS 精简依据、规则迁移与维护 | [迁移对照](retrospectives/2026-10-16-instruction-migration.md) |

## 当前权威与专项说明

| 范围 | 文档及适用关系 |
| --- | --- |
| 临床默认视觉 | 不可变 [Windows UI/UX v1.0](<Windows 灵动岛 UI UX 设计规范 v1.0.md>)；当前适配解释 [UIUX-V1-IMPLEMENTATION](UIUX-V1-IMPLEMENTATION.md) |
| 检验阅读器 | 不可变 [场景说明](<protype/灵动岛「检验报告阅读」开发文档（Agent 可读版）.md>) 与 [参考 HTML](<protype/灵动岛 · 检验报告阅读（阅后即焚）.html>)；[实现边界](LAB-READER-IMPLEMENTATION.md)，按用户要求不实现水印 |
| 最新职责和来源会话 | [APP-SPLIT-20261014](APP-SPLIT-20261014.md)；替代旧共享 studio/岛连接的描述 |
| 最新动效生效策略 | [MOTION-RESTORE-20261013](MOTION-RESTORE-20261013.md)；[UIUX-REFINEMENT-20261013](UIUX-REFINEMENT-20261013.md) 补充空 S0 cursor-only hover |
| 生命周期与性能依据 | [TS/React 优化](TYPESCRIPT-REACT-OPTIMIZATION.md)、[Rust 内核优化](RUST-PERFORMANCE-OPTIMIZATION.md)；收益仅适用于报告中的测量层与环境 |

用户当前明确要求优先于历史实现选择。原始规范不重写；需要解释差异时写专项说明并建立索引，不能通过改输入使检查通过。

## 历史路径与验收演进

| 历史材料 | 查阅条件与现状 |
| --- | --- |
| [01-research](01-research.md)、[02-validation](02-validation.md)、[旧 U-notch](NOTCH-MOTION-UPDATE.md) | 研究和 legacy 基线；不是当前临床尺寸权威 |
| [hover 稳定性](HOVER-STABILITY-FIX.md)、[点击闪烁](CLICK-FLICKER-FIX.md) | 修改旧几何/交接路径时读；保留事故与有限屏幕证据 |
| [Clinical implementation](CLINICAL-IMPLEMENTATION.md)、[早期连续动效](CLINICAL-MOTION-RESTORE.md)、[UI Spec](Dynamic-Island-UI-Spec.md) | 临床接入、静态 fallback 与 160×34/540ms 的历史；当前视觉已被 Windows v1.0 覆盖 |
| [PRD 场景](prd/Clinical-Island-Scenarios.md)、[研究](prd/Clinical-Island-Global-Research-20261002.md)、[接续](prd/Clinical-Island-Free-Plan-Continuation-20261002.md) | 合成场景及研究范围；不代表真实医院接入或生产能力 |
| [UIUX continuation](UIUX-V1-CONTINUATION.md)、[PR #1 修复](PR1-REVIEW-20261011.md) | 历史候选、失败及修复；不把旧测试数量作为当前验收 |

新文档加入本索引；可执行的当前约束放专题指南，事故归复盘，命令仍以 package/config/script 为源。历史报告本身保持原字节。
