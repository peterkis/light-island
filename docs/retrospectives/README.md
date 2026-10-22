# 复盘与避坑索引

这里保存经会话原记录、源码和证据交叉核对的经验。优先级表示再次发生的影响，不表示当前仍存在同级未修复缺陷。实现前只读与任务相关的主题。

本轮：[2026-10-16 跨会话深度复盘](2026-10-16-cross-session.md) · [来源与覆盖](2026-10-16-sources.md) · [AGENTS 迁移对照](2026-10-16-instruction-migration.md) · [验证回执](../../evidence/retro-20261016/RESULTS.json)

| 优先级 / ID | 症状、坑与关键词 | 检索主题 | 当前执行入口 |
| --- | --- | --- | --- |
| P1 R01 | 报告删除、撤回、迟到回复、只隐藏 DOM | [所有阅读入口失效](2026-10-16-cross-session.md#r01) | [状态边界](../agents/architecture.md) |
| P1 R02 | 元数据泄露、TS 断言、监听泄漏 | [边界校验与连接清理](2026-10-16-cross-session.md#r02) | [状态边界](../agents/architecture.md) |
| P1 R03 | 墙上时钟回拨、阅读超期、暂停预算 | [单调时钟](2026-10-16-cross-session.md#r03) | [状态边界](../agents/architecture.md) |
| P1 R04 | preview/desktop 串扰、timer 被重置 | [实例所有权](2026-10-16-cross-session.md#r04) | [两应用拆分](../APP-SPLIT-20261014.md) |
| P1 R05 | 高 FPS 仍闪白、SVG 双写、透明挡板、抢焦点 | [呈现与输入一致](2026-10-16-cross-session.md#r05) | [UI/原生](../agents/ui-native.md) |
| P2 R06 | 动画库存在却不动、首帧闪动、SPI 失败 | [有效动效策略](2026-10-16-cross-session.md#r06) | [UI/原生](../agents/ui-native.md) |
| P2 R07 | 灰框、白边、S0 hover 灰底、旧尺寸 | [逐症状视觉验证](2026-10-16-cross-session.md#r07) | [视觉修复](../UIUX-REFINEMENT-20261013.md) |
| P2 R08 | 端口占用、旧 EXE 锁、错误服务会话 | [进程和端口归属](2026-10-16-cross-session.md#r08) | [验证](../agents/validation.md) |
| P2 R09 | 错夹具、虚拟 clock、HMR、grep 未生效 | [可信测试前提](2026-10-16-cross-session.md#r09) | [验证](../agents/validation.md) |
| P2 R10 | rAF 当 DWM、单进程内存、内核提速外推 | [性能证据分层](2026-10-16-cross-session.md#r10) | [验证](../agents/validation.md) |
| P2 R11 | Windows rename 误报、冒号索引、旧 head 批准 | [审查前提与候选](2026-10-16-cross-session.md#r11) | [发布/清理](../agents/publication-cleanup.md) |
| P2 R12 | 拆包后 dist/index.html 不存在、Node/Rust 漂移 | [打包及契约](2026-10-16-cross-session.md#r12) | [架构](../agents/architecture.md) |
| P2 R13 | 未接 CI、类型检查漏 tests/tools、历史规则膨胀 | [环境门禁和导航](2026-10-16-cross-session.md#r13) | [AGENTS 迁移](2026-10-16-instruction-migration.md) |
| P2 R14 | 清理后回执失败、字典统计、换行哈希、13.8 GB | [可恢复清理](2026-10-16-cross-session.md#r14) | [发布/清理](../agents/publication-cleanup.md) |
| P2 R15 | 其它会话改动、错误基线、先推 main 后审查 | [协作与发布顺序](2026-10-16-cross-session.md#r15) | [发布/清理](../agents/publication-cleanup.md) |
| P3 R16 | 46k token 输出、整段日志、重复轮询 | [工具经济性](2026-10-16-cross-session.md#r16) | 本轮复盘及 [验证](../agents/validation.md) |
| P3 R17 | 自动审批拒绝、普通启动未测、PARTIAL 被抹平 | [信息可得性和验收措辞](2026-10-16-cross-session.md#r17) | [验证](../agents/validation.md) |

维护规则：增加新条目前找已有主题；重复发生时补第二个来源及失效原因。先确认能否由已有测试、类型或 CI 拦截。新建确定性检查要给出负例；需要跨路径判断的要求放 [审查标准](../../CODING_STANDARDS.md)。不要将完整复盘装回 AGENTS，也不保存真实临床内容或原始个人会话全文。
