# 发布、审查与清理

仅在当前任务授权这些操作时使用；授权已经明确就继续，无需重复确认。普通实现/文档任务不自动获得历史会话的发布或删除授权。

## 提交与 PR

1. 读取工作区、分支、worktree、stash、远端及已有验证记录。存在其它会话改动时保存起点清单/哈希，不以 HEAD 代替实际工作区基线。
2. 使用已审查的显式文件 allowlist 暂存。排除 profile、传输包、EXE/PDB、日志中的秘密和无关改动；合成证据与原始失败按仓库规则保留。
3. 检查 staged diff、不可变输入、实际检查范围和候选哈希。没有变更就报告事实，不造空提交；用户另有明确意图时再执行。
4. push 后对比本地 HEAD、tracking ref 和 `git ls-remote` 的实际远端 ref；创建/更新 PR 描述为最终行为与验证，不保留放弃方案作为现状。
5. 按用户要求在 PR 发 `@codex review`，每轮记录 request、reviewed head、finding 和验证。修复后重新提交、推送、请求当前 head 审查。

先 PR 审查再合并到 main；已推 main 后再造临时基线供回看只用于历史补救，不作为默认发布流程。

## 审查判定与合并

- 每条意见先验证前提。使用最小测试、实际 DOM/平台调用、当前工具链官方实现，区分 FIXED、NOT_REPRODUCED_HARDENED 和有证据的误报。
- 不能因“意见看起来合理”删除正确回退或改用有风险的文件操作。历史 Windows `fs::rename` 误报已由该工具链实现和连续覆盖保存证伪。
- 查看当前 head 对应的审查结果、全部 review threads 和适用 CI；PR MERGEABLE/CLEAN 或请求评论没有 reaction 都不是批准。bot 的结果和 reaction 可能出现在 review 或 PR 本身，必要时只读核对相应 API。
- 有界等待，沿已记录 cursor/时间查询新结果，状态未变不重复下载完整 PR/大 diff 或持续播报。不要用旧 head 的“无 major”结果放行新代码。
- 合并前再次核实 exact reviewed head、所有 P1/P2 的有效处置、未解决 threads=0、检查结果、源码/EXE和规范哈希。仓库没有适用 CI 时如实记录，不虚构 green。
- 使用 `gh pr merge --match-head-commit <reviewed-sha>`。合并后本地 main 安全快进，核实 live remote/main 一致及合并树匹配候选；避免打印完整巨量 diffstat。

## 可恢复的清理

用户所说的 workbench 清理，结合本项目应区分工作台源码/交付物与工作树、Rust 编译缓存。两个应用及其必要源码、证据和已交付 EXE 保留；删除对象以已核实的授权范围为准。

1. **Prepare**：记录分支合并祖先、worktree 所属及未提交/未推送状态。清理本任务已合并分支；Codex 管理 worktree 用对应归档机制。不能清理无关会话工作树。
2. **Inventory**：用 PowerShell 解析最终绝对路径，验证在明确工作区内；检查根及后代 reparse points。只枚举/删除已审查的具体缓存路径，单一 shell 端到端操作。
3. **Persist**：删除前将路径、字节/文件数、tracked 和产品哈希写入持久回执。记录使用 `[pscustomobject][ordered]@{...}`；先确认统计能成功，再进行删除。
4. **Delete**：使用 `Remove-Item -LiteralPath`，不把枚举结果拼进 `cmd /c`。逐项写状态；报告格式化失败不能回滚已经发生的删除，也不能误报“全部没执行”。
5. **Verify**：复核 tracked 漂移、规范/EXE 哈希、main/live remote、剩余工作树/分支与自有端点。报告失败时从已保存 inventory 恢复，只读重验，不能编造丢失的精确字节数。

Git 自动换行可能在 main 快进时改变普通源文件的磁盘字节。用于证明删除未伤源码的 raw-hash 基线应在快进后采集；Git tree equality 与 raw bytes 分开判断。不可变输入及冻结证据遵循 `.gitattributes`。

只在用户明确要求迁移时处理 C 盘项目临时证据/profile；确认不用后复制到 D 盘、逐文件校验再移除。Codex 的全局会话、记忆和插件不是项目缓存，不一并迁移。目录逻辑大小、磁盘可用空间增量和压缩后大小是不同指标。

事故依据及恢复结果见 [清理复盘](../retrospectives/2026-10-16-cross-session.md#r14)。
