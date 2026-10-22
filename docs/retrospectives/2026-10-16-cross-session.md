# 2026-10-16：灵动岛跨会话深度复盘

范围是本会话及本项目另外四个 Codex 主会话、两条相关 ChatGPT 设计会话，另核对三份当时的只读审计记录；覆盖 Git 基线、阅读器、TS/React、Rust 性能、UI/UX 恢复、两应用拆分、PR #1/#2 与清理。设计分支有共享历史，不重复计作独立验收。详见 [来源台账](2026-10-16-sources.md)。

最需要保留的经验是：**先守住状态失效和实例归属，再谈渲染成本；对每个实际症状取证；让机械检查真正执行。** 历史问题多数已经修复，以下 P1/P2 是复发影响排序。不能据此声称目前存在这些未修复缺陷，也不能把用户所说的“效果被优化掉”全部归因于性能改动。

## 按影响排序的事故与措施

<a id="r01"></a>
### P1 R01：修过来源窗口，不等于修过所有阅读入口

**事实。** PR #1 的第二轮发现 `?source=` 不经过原 request key，遗漏报告寿命清理。TS/React 诊断随后又发现主岛 `if(a)` 在权威 snapshot 删除对象时跳过 invalidate：正文隐藏了，报告引用、摘要会话和保护状态却可保留。已有来源窗口测试没有覆盖岛内 reader。两个会话重复暴露了同类“只查一条入口”的盲区。

**原因。** 将可见性、对象存在和会话存活混为一体；清理附着在 selected/request 的便利路径，而不是权威来源变更。**措施。** 对象不存在也执行失效；按对象/版本/session/权限校验回复，清理后迟到回复不能复活。对岛内 alert/sum/read、来源页、预览覆盖层分别测试删除、撤回、版本、权限和断连。现有 `lab-source-lifetime`、reader/布局失败相关回归继续承担行为门禁。[PR #1 记录](../PR1-REVIEW-20261011.md)、[TS/React 记录](../TYPESCRIPT-REACT-OPTIMIZATION.md)。

<a id="r02"></a>
### P1 R02：类型安全、界面遮罩与连接成功路径都不是边界闭环

**事实。** PR #1 修复未授权 activity/snapshot 的 `labRef` 元数据暴露。TS 审计发现直接断言原生/网络返回值；连接的第二个监听注册失败后，第一个监听未回滚，初始化拒绝也未完整处理。

**原因。** 把 `invoke<T>` 当运行时验证，把“正常 setup/cleanup 成功”当失败场景也成立。**措施。** 未知数据先 parse；畸形 snapshot 不解释为删除；出站类型与 Rust/服务端白名单同时限制。监听按 generation 和 AbortSignal 管理，部分失败逆序释放，StrictMode 和迟到注册补负例。当前 `bridge-lifecycle`、`native-contract`、protocol 等测试已经存在，本轮接入统一检查，不新增同义治理框架。见 [架构指南](../agents/architecture.md)。

<a id="r03"></a>
### P1 R03：阅读寿命必须使用同一个单调时间体系

**事实。** PR #1 的墙上时钟回拨测试证明阅读可以超过应有寿命。后来显示失败又暴露“正文已隐藏，但 hover 暂停仍等 8 秒遮罩才恢复预算”的真实问题。

**原因。** 墙上时间、显示 tick、暂停和原生截止桥接各自算账；只看最终隐藏会遗漏预算。**措施。** 阅读统一 `performance.now()`/`ReadBudget`，暂停停展示 tick，恢复沿原预算，布局失败立即走既有 mask。测试在页面启动前安装虚拟时间，先等状态已收到再推进；回拨用例首次 `pauseAt` 留 100ms 引起工具失败，改为足够通信余量。工具失败不是产品 RED。[PR #1](../PR1-REVIEW-20261011.md)、[TS/React 优化](../TYPESCRIPT-REACT-OPTIMIZATION.md)。

<a id="r04"></a>
### P1 R04：拆成两个 EXE 后，还要拆回调副作用和本地状态

**事实。** 两应用已经分离，但 PR #2 多轮仍发现工作台动效选择器与桌面目标耦合、桌面报告 replay 先调用预览 `close()`、工作台绑定失败仍可能连接端口上的其它 v2 来源或启动岛。

**原因。** 进程边界实现了，按钮调用前的 guard/close、模块级 sender、首次连接和延迟回调仍沿旧心智模型。**措施。** 来源、连接、控制器、计时与显示偏好按实例拥有；显式实验目标贯穿整条调用链。自己的 listener/session 就绪才连接/启动；桌面实验不得 burn-block 预览阅读。来源 reset/reconnect/重要事件不改变个人 deadline。第六轮先有两次错误 setup，第三次才拿到真实 RED；修复后聚焦浏览器与原生目标隔离通过。[拆分说明](../APP-SPLIT-20261014.md)、[第六轮回执](../../evidence/publication-20261014/review-round-6/RESULTS.json)。

<a id="r05"></a>
### P1 R05：正确终态和高 rAF 不能保证中间帧、输入与焦点正确

**事实。** 历史 hover/click 中，HWND 收缩出现空白；临床转换中 React 写入目标 SVG viewport、旧 path 尚未完成，真实屏幕捕获发现瞬态瑕疵。capture 路径还曾包含不必要的 `set_focus()`；当时原生没有复现抢焦点，不能把代码风险说成已复现的桌面失败。

**原因。** 把动画画布当成输入区域，或让 React/动画引擎分别拥有 SVG 属性；只测 rAF 和最终尺寸。**措施。** 稳定 HWND、单 SVG owner、有序有限 previous/next HRGN 与 AA fringe；同时查 viewport/path、桌面像素、真实点击与 Win32 foreground。权限变化先删除内容，不能等 outgoing 完成。细节按 [原生约束](../agents/ui-native.md)，保留 [hover](../HOVER-STABILITY-FIX.md)、[点击](../CLICK-FLICKER-FIX.md)、[临床动效](../CLINICAL-MOTION-RESTORE.md) 的历史依据。

<a id="r06"></a>
### P2 R06：诊断“动画没了”，先查最终策略而不是库或 FPS

**事实。** 本机 Windows client-area animation 为 OFF；此前性能报告明确只验证原生 reduced 路径。另一方面通用入场 scale 固定 1、数字只换文本、CSS/media 与 JS 分别关动效，确有规范差距。PR #2 又发现保存偏好加载前的首帧、系统结果未知、SPI 查询失败、focus 后刷新等遗漏。

**原因。** 把 reduced=false 当作 full，把“调用了 API”当作查询成功；多个开关解析不同结果。**措施。** 记录枚举、应用开关、media、Windows 成功/输出及 reason；未知/失败保持 reduced，明确 full 才覆盖系统，应用 reduced 优先；CSS/JS 共用结果。事件驱动刷新、单在途与卸载清理，不轮询。测试覆盖首次加载和失败值，不只测试切换后的正常状态。[动效恢复](../MOTION-RESTORE-20261013.md)、[平台/启动回归所在目录](../../tests/)。

<a id="r07"></a>
### P2 R07：用户点名的三个视觉缺陷必须逐个取证

**事实。** 本会话浏览器实测空 S0 hover 灰底 `rgb(44,44,46)`、横线、尺寸膨胀；原生样式仍有 `WS_CAPTION/WS_THICKFRAME` 的亮边。根背景透明、运行时 chrome、hover 行为分别处在不同层。只检查 Tauri JSON 或一个静态截图不足以同时排除三项。

**措施。** 灰框看 html/body/root 和实际底板；白边看 runtime style 与物理 AA；hover 看 computed style、几何、mark 和 cursor。空 S0 124×32 纯黑 pointer-only，键盘 focus 保留；不误删 active Compact 的 Peek。当前临床遵循 v1.0，旧 160×34/540ms 不能混入。原始规范及哈希固定，本轮新增检查防止修改输入后重新生成 tokens 使漂移看似合法。[视觉修复](../UIUX-REFINEMENT-20261013.md)。

设计分支曾发现灰块尺寸/颜色与 900×590、`#DBE5E8` 合成 QA 底板相同，但当时远程命令超时，尚未通过窗口枚举确认归属。这是排查线索，不能直接写成已证实的透明 CSS 缺陷；检查残留 QA 背景与异常退出清理同样必要。

<a id="r08"></a>
### P2 R08：先确认进程/端口归属，再决定能否复用或停止

**事实。** 17322 被旧进程占用，连续触发 EADDRINUSE；旧 QA EXE 被 Windows 占用且拒绝自动结束，用户正常退出后才完成构建。两应用初次拆分还可能把占用端口的其它 v2 服务当作自己的来源。

**措施。** 按路径、EXE hash、PID、启动时间、父子树及端口验证；可用配置选择独立端口，默认不复用未知服务。自己的 listener/session 是连接/启动门槛。QA 停止也只匹配已记录的实例；端口占用不构成结束未知进程的授权。不能重复原样重试或把 `reuseExistingServer=true` 当万能修复。见 [验证指南](../agents/validation.md)。

<a id="r09"></a>
### P2 R09：先证明夹具进入了正确场景，再把失败归给产品

**重复案例。** PR #1 HTTP 设置返回后立即推进 clock，WS 还未应用；测试期间 build 写 tokens 触发 Vite HMR/重复挂载；TS 优化有 native-reader 用例语法错误和初始化同步问题；本会话关闭 autoPreview 后仍等 alert、把普通 S04 当专用报告，以及 npm grep 转发未按预期筛选。

**措施。** 构建→测试顺序执行；等待可观察业务状态、正确报告 variant、online 和 effective motion。虚拟 clock 先安装；用 `--list` 核实筛选。分别保存 setup error、真实 RED、GREEN，不通过扩大产品行为“救夹具”。全量与局部结果分开记录：拆分初轮的 103 通过 + 3 个 DPR 失败及后续相关重跑，不应写成一次 106/106 全绿。证据见 [PR #1](../PR1-REVIEW-20261011.md)、[拆分回执](../../evidence/app-split-20261013/RESULTS.json)。

<a id="r10"></a>
### P2 R10：性能收益与验收结论必须留在实际测量层

**事实。** TS 来源路径 397,062→265,234 B 是递归静态 JS 成本；开发 Profiler 提交耗时不是生产固定倍数。Rust 轮廓分配 50→2、内核约 31–45% 改善成立，但整命令和未改 metrics 对照都曾波动，不能宣称整应用等比例提速。阴影镜像优化在整数宽度附近出现一像素 differential mismatch，需要不对称回退。

**措施。** 相同基线/模式、matched control、交替多轮，保留慢轮和离群值；差分验证边界后才优化。区分 JS 包、React commits、原生 IPC/内核、rAF、实际屏幕与 DWM；完整 WebView2 树才是应用内存。算法缩放与浏览器 DPR 都不替代物理 DPI 真机。见 [TS 性能记录](../TYPESCRIPT-REACT-OPTIMIZATION.md)、[Rust 记录](../RUST-PERFORMANCE-OPTIMIZATION.md)。

<a id="r11"></a>
### P2 R11：审查意见也需要验证前提，批准必须对应当前 head

**事实。** PR #2 的 Windows `fs::rename` 替换失败意见，被当时 Rust 1.94 的 Windows 实现和两工程连续五次保存证伪；没有采用“先删旧文件”的危险修法。数字翻页意见假定冒号没有 `data-digit` 节点，实测有五个节点且回归修复前已通过；后来明确读取 data 属性属于加固，记录为 NOT_REPRODUCED_HARDENED。

**措施。** 每项列出前提、复现、判定、最小变更与验证。历史 PR #2 共七轮、十二个讨论已处置，不能写成“十二个都是真实缺陷”。最终审查匹配 `48e506fc...` 后才合并；空 reaction 列表、PR CLEAN 或旧 head 结果都不代替该判定。请求评论与 PR 本身的 reaction API 也可能不同。见 [来源台账](2026-10-16-sources.md) 和 [发布指南](../agents/publication-cleanup.md)。

<a id="r12"></a>
### P2 R12：打包边界变了，静态服务器和开发适配器也要一起变

**事实。** 两包已变成 `dist/workbench`、`dist/island`，Node demo 仍假设顶层 `dist/index.html`。只 build 成功没有验证 HTTP 入口及 hashed assets。Rust 模拟引擎与保留的 Node 开发源若独立演进，也可能在业务细节上漂移。

**措施。** 静态路由覆盖两套根、三个页面、各自资源与 traversal 负例；source/app bundle checker 检查实际依赖。Node golden fixture 与 Rust 相同案例交叉约束，来源握手/私有路由单独回归。`test:protocol` 单独只检查 Node 生成的一致性，不应称为已运行两个 Rust 工程。本轮复用 `static-frontend`、protocol、bundle 等既有检查并接 CI。

<a id="r13"></a>
### P2 R13：没有接线的检查与长历史 AGENTS 都会制造盲区

**事实。** TS 最初仅查 src；扩展 tests/tools 得到 35 条诊断，增加两个严格选项得到 20 条迁移诊断，这不等于 55 个产品缺陷。检查范围已修复，但复盘开始时没有 aggregate check、运行检查的 CI 或有效本地 Git hook。根 AGENTS 达 14,131 B / 110 行，十三节按日期追加；旧高度、shrink-at-rest、静态 fallback、共享连接与新策略混在同一常驻上下文。scripts/README 仍指示桌面另开 Node。

**本轮落实。** 根 AGENTS 改为边界+条件入口+完成条件，详情迁移至四个专题指南；审查判断放 CODING_STANDARDS，建立文档和复盘索引。新增只读检查：根文档 4 KiB 本地预算、导航/本地锚点、命令引用及三份设计输入的固定哈希；补负例测试。`npm run check` 顺序接既有检查，Windows CI 运行它。**4 KiB 是本项目维护预算，不是 OpenAI 限制。** 远端运行在本任务未发布前仍为 NOT_RUN；Rust 与实机继续按变更层手工执行。详见 [迁移对照](2026-10-16-instruction-migration.md)。

<a id="r14"></a>
### P2 R14：清理必须先保存清单，回执阶段才能可靠恢复

**事实。** PR #2 合并后删除两套 target 缓存，统计 `[ordered]` 字典的 `Measure-Object logicalBytes` 失败发生在删除及部分校验之后。随后只读恢复，用已保存的旧 inventory 估计约 13.8 GB，并复核 2,237 个 tracked 文件零漂移和两个 EXE 不变。不能报告精确磁盘释放增量。构建期间也曾 LLVM OOM；单并发在资源未恢复时重试仍失败。

**措施。** Prepare/Inventory/Persist/Delete/Verify 分阶段落盘；使用 PSCustomObject，删除前验证统计和回执；最终 literal 绝对路径、工作区范围、根与子项 reparse 检查齐全。快进后的 raw-hash 才能证明清理无损，避免 autocrlf 假漂移。工作台源码和交付 EXE 不是缓存。OOM 先观察资源再串行有限重试，不杀其它任务。详见 [发布与清理](../agents/publication-cleanup.md)；本轮不再执行清理。

<a id="r15"></a>
### P2 R15：跨会话协作先固定实际基线，发布顺序避免事后补审

**事实。** Rust 优化开始时工作区已有 TS/React 改动，两组需要分开发布；当时使用实际工作区/产物作为性能基线，保留未编辑文件哈希，避免把另一组工作收入自己的 commit。PR #1 则在实现已推 main 后才补建临时基线进行审查，增加分支、快进和清理复杂度。

**措施。** 读取 dirty status、保存初始/最终 manifest、允许清单暂存、live remote ref 复核。发布默认先 feature PR→当前 head 审查→合并→安全快进，不把事后审查补救固化成流程。用户只是请求本轮文档复盘时，不继承旧“提交并推送”的授权。[优化记录](../TYPESCRIPT-REACT-OPTIMIZATION.md)、[Rust 基线](../RUST-PERFORMANCE-OPTIMIZATION.md)、[PR #1 发布说明](../PR1-REVIEW-20261011.md)。

<a id="r16"></a>
### P3 R16：大输出本身会让后续判断更慢、更不可靠

**事实。** 本会话曾把 web 返回字符串当对象展开，输出约 46k tokens；main 快进打印千余行 diffstat。此次复盘开头也重复发生官方搜索 JSON、thread 全量 item 和多文档批量输出截断，说明“少输出”的口头提醒尚未转化为稳定动作。

**措施。** 根据工具真实返回结构解析后只保留 URL/目标字段；原始响应本地保存，先 headers/keys/路径清单，再按问题读取片段。日志按会话 cwd/ID/事件类型过滤，排除 analysis、嵌入图片和重复工具结果；独立读取并行，改动/构建/测试按依赖顺序。PR 等待读取增量，不重复整包下载。这里是工具使用判断，不增加不可靠的“禁止大输出”源码正则或全局配置。范围只改项目指南，全局 AGENTS/skills/记忆未改。

<a id="r17"></a>
### P3 R17：访问受限与未执行必须原样留下，但不永久扩大限制

**事实。** 历史普通启动/清理组合被自动审批拒绝，结果为 NOT_RUN；浏览器插件本地客户端不可用、Figma 配额限制也阻止过某些观察。项目自有 Playwright、Win32 和受归属校验的 QA 脚本仍提供了部分证据。代码检查通过不能补成运行时 PASS。

相关设计分支还出现远程设备列表 Online，但 ping 和读取 8 行文件各等待约 120 秒后超时。该会话明确未改文件、未运行测试；额外授权不能修好断开的命令通道。可操作性应由最小只读调用证实，限制重试次数，再改用已授权可用的本地工具或如实说明外部阻塞。

**措施。** 明确缺的是哪一层，能替代时用最小可行工具，不反复请求已经给过的权限；不能安全执行就保留原因和未测范围。当前机器/权限改变后重新核实，不把历史拒绝写成永久禁令。PARTIAL、失败、设备矩阵和合成只读边界不能被最终成功覆盖；新增 evidence 目录避免旧文件重写。

## 这次改变了哪些环境

| 类别 | 改善 | 状态与局限 |
| --- | --- | --- |
| Navigation / No-ops | 统一文档索引、按任务路由、旧规则迁移表 | 已落实；旧报告保留，不把原始设计删改 |
| Automated checks | 输入/导航检查、负例、统一 check 与 Windows 前端 CI | 本地验证见 [回执](../../evidence/retro-20261016/RESULTS.json)；远端未运行，未装 hook |
| Coding standards | 跨路径、语义、证据与审查前提单列 | 已落实；机械问题由检查/现有测试负责 |
| Global AGENTS | 将本项目冗长规则移出根文件 | 仅改项目；没有更改用户全局配置 |
| Tool economy | 保存来源范围，缩小字段和输出，按依赖执行 | 已记录本轮仍出现的反例；不宣称已消除全部行为问题 |
| Information access | 台账定位本地会话、已发布证据与官方指南 | 不导出原始私人日志；设备/平台层未测不能靠文档补证 |

继续工作的完成条件是：找到适用指南、覆盖具体行为、执行相应检查并准确报告范围。下次复盘先核对本表的机制是否实际拦截了复发，再决定是否增加规则。
