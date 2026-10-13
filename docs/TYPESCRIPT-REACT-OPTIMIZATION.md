# TypeScript / React 渐进优化交付记录

日期：2026-10-13。起点：`0aa4ea9e7eb43fbdfb07f89a0cc8e3e06d5d301b`。本轮未提交或推送。

本轮按 `typescript-advanced-types`、`vercel-react-best-practices` 实施既定优化。保留临床只读、legacy 收到回执语义、数值弹簧、单 SVG 所有者、稳定 HWND、单连接及有序轮廓交接。没有引入状态管理库、动画框架、React Compiler 或 Next.js API。

最终汇总及原始结果位于 [本轮证据](../evidence/optimization-20261013/RESULTS.json)。结果为 **IMPLEMENTED_WITH_BOUNDED_NATIVE_VALIDATION**，不是临床系统或全设备验收。

## 实现与接口

| 范围 | 已实施措施 |
| --- | --- |
| 阅读会话失效 | 权威快照先更新当前镜像，再校验阅读对象。对象删除、版本、撤回及权限失效均进入既有清理路径；拒绝迟到回复。删除覆盖摘要、阅读和悬停暂停三个阶段 |
| 连接生命周期 | `connect` 接受取消信号；部分监听注册失败回滚，旧 generation 不再投递或安装 sender；临床和 legacy 均处理初始化拒绝。每窗口每次 online 只发一次显式同步 |
| 运行时输入 | `WireEnvelope` 保持未知字段；`parseClinicalEvent`、`parseActivity`、`parseTimerState`、原生 metrics/platform 解析器把验证后的数据交给状态。畸形计时消息保留原状态；畸形快照不被解释为删除 |
| 类型关联 | `Activity` 关联场景、路由及报告引用；`TimerState` 的 running 必须带数值 deadline，其余状态带 null。场景图标使用完整键集合，报告分组使用具名结构 |
| 出站边界 | 分开临床岛、模拟器、legacy 命令类型及发送接口；分开 `configurePreferences` / `configureSimulation`，岛组件不暴露模拟器控制。Rust/服务端运行时限制继续保留；legacy 的只读 sync 纳入 Rust 白名单 |
| 类型门禁 | `npm run typecheck` 检查应用、测试、配置及两个临床 JS 生产端；后者使用 checked JSDoc 和共享协议类型。新增直接开发依赖 `@types/node@24`，编译负例覆盖错误命令、路由和计时状态 |
| 应用严格选项 | `src` 启用 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`。测试/工具配置仍启用 strict，但不套用这两个额外迁移选项；没有用批量非空断言或 any 压制应用诊断 |
| 原生交接失败 | 初始化、frame、commit 均有有限失败处理和超时；旧 epoch 迟到不能覆盖当前表面。清理动画资源，在最后确认的区域提供非敏感重试，重试使用新 epoch。未取得初始原生区域时仍保持原生窗口安全隐藏 |
| 阅读与渲染 | 相同 snapshot 不提交；悬停暂停时停止展示时钟，恢复仍按单调预算计算。报告行及工作台场景、控制、背景区域设置稳定 props 和 memo 边界；清除和权限变化卸载敏感子树 |
| 拖动与采样 | 原始位置/速度保留在 ref，活跃手势每帧最多提交一次展示更新；抬手、取消、失焦和卸载清理待执行帧。两套工作台的性能采样统一为有限、可取消任务，后台样本无效 |
| 平台工作 | 隐私及隐藏状态暂停亮度采样，保留单请求在途和动画期跳过；合并平台首次读取，删除连接复用时无条件发送的旧协议 sync |
| 来源入口 | 按 URL 选择来源页或完整应用；来源页只挂载镜像、票据读取和失效清理，不挂载岛内手势、弹簧或阅读预算。共享 `SourceView` / `ReportRows`，保留工作台懒加载 |

额外故障回归确认：几何失败时正文虽然已隐藏，悬停暂停原先仍可能等待 **8 秒自动遮罩**才恢复计时。这并非无限保留缺陷。本轮在显示失败时立即调用既有遮罩行为，继续原预算；没有修改阅读时长、截止规则或个人计时。

## 验证结果

| 检查 | 最终结果及证据 |
| --- | --- |
| 类型检查 | PASS；应用严格选项、测试/工具及 JS 生产端检查均通过；包含编译负例 |
| TypeScript 单元测试 | **231/231**，12 个测试文件；[unit-final.json](../evidence/optimization-20261013/unit-final.json) |
| Rust | **8/8**，Release / locked；`rust-final.log` |
| 浏览器回归 | **93/93**，0 skipped、0 unexpected、0 flaky；[最终报告](../evidence/optimization-20261013/e2e-final/playwright-results.json) |
| 完整前端及桌面构建 | PASS；`desktop-final.log` 包含 token 生成、完整 typecheck、Vite 和 Release 构建 |
| 来源包边界 | PASS；递归静态 JS 依赖中不含 GSAP、岛布局、手势、按钮动效、主控制器或岛内阅读 Hook；[产物记录](../evidence/optimization-20261013/bundle-final/source-bundle.json) |
| 不可变输入 | 三份输入 SHA256 与 Git 基线一致；[校验记录](../evidence/optimization-20261013/immutable-inputs.json) |

最终 EXE：`src-tauri/target/release/samewave-island.exe`，SHA256：

```text
a056b570c02f77dd00dfde5a4f6e88b3005ded2d64679651b366c49806553836
```

代码清单及哈希见 [final-source-hashes.json](../evidence/optimization-20261013/final-source-hashes.json)。此前 204 项清单零漂移；后加入并执行的延迟 QA 脚本纳入最终 205 项清单。功能源码和 EXE 在最终回归后没有改动。

## 性能记录

| 指标 | 基线 | 本轮 | 解释 |
| --- | ---: | ---: | --- |
| 来源窗口启动路径 JS | 397,062 B | 265,234 B | 减少 **33.2%**；包含 bootstrap、来源页及递归静态共享依赖，排除 CSS、sourcemap 和未加载的动态分支 |
| 同一路径 gzip | 131,047 B | 84,004 B | 相同 gzip 实现；不把单个入口 chunk 当总加载成本 |
| 暂停阅读时 React 提交 | 16 | 0 | 128 行合成报告、约 1.5 秒观察窗口 |
| 运行计时时 React 提交 | 16 | 15 | 仍保留 100ms 展示精度；减少的是无关渲染工作 |
| 运行计时的单次提交耗时中位数 | 35.45 ms | 0.30 ms | React 开发态 Profiler 的本机样本，不能解读为生产环境固定倍数提速 |
| 原生重要提示可交互时间中位数 | 178.9 ms | 181.3 ms | 各 7 次预热观察；包含本机发送和下一 rAF 采样，差值小于一个观测帧间隔；不是冷启动或 DWM 时延保证 |
| 应用 + WebView2 私有工作集 | 218.88 MiB | 217.67 MiB | 包括主岛和一个来源窗口，无 studio；单次短样本只作记录，不据此宣称显著内存优化 |
| 同一进程树私有提交 | 351.03 MiB | 338.29 MiB | 不以 Rust 单进程内存替代应用总量 |

原始数据：`profile-recheck/react-profile-*.json`、[包体对比](../evidence/optimization-20261013/bundle-comparison.json)、[原生对比](../evidence/optimization-20261013/native-comparison.json)。首次单次 Playwright 轮询得到的 settled 时间也保留在原始文件中；延迟比较使用后补的 7 次“settled、可交互、opacity ≥ .95”观察，不混用两种口径。

带 QA 的进程启动至调试端点可用分别记录为 2170 / 1875 ms。它只是一次端点就绪观察，不能作为正常启动速度结论。来源窗口处于独立 WebView2 环境，未被该 9223 端点枚举，**来源冷内容时延为 NOT_RUN**。

## Windows 实机范围

本机 Windows 11 Pro 10.0.26300、96 DPI、WebView2 154.0.4258.62。系统动画开关为关闭状态，未改动该用户设置。

- 四次紧凑/详情转换合计 344 个 rAF / SVG 样本，viewport 与表面尺寸不匹配为 0；物理 HWND 始终为 `[608, 0, 1312, 622]`。
- 转换记录 12 次区域处理，静止后的区域更新为 0；窗口位置/尺寸变更为 0。
- 重要来源推送保留前台焦点，岛端拒绝临床确认及模拟器命令。
- 合成背景窗口的 **3 次真实点击穿透**全部通过；**55 个实际屏幕样本无空白**，保留截图及原始帧记录。
- 独立来源窗口通过自有 PID / HWND 清单及前台截图确认，显示正确的合成 LIS / DEMO-S03 / v1。未将 Win32 截图检查冒充来源 DOM 性能测量。

证据在 `native-final/`，屏幕与点击检查在 [screen-continuity](../evidence/optimization-20261013/native-final/screen-continuity/native-click-focus.json)。这一轮实机验证属于**系统减少动态路径**；普通数值弹簧在浏览器回归通过，但本轮没有完成普通动效的实机呈现验收。rAF 不是 DWM 呈现帧，55 张有限采样也不是逐帧无缺口保证。

Windows 10、物理 125/150/200% 和混合 DPI、多设备/触屏、Narrator、DWM / 120Hz，以及真实临床集成仍未验收。它们不能从本轮软件通过结果推导为 PASS。

补充的普通启动/自有进程清理组合命令在执行前被自动审批拒绝，只提供 `blocked by policy`，因此普通启动运行时冒烟检查标记为 **NOT_RUN**。只读复核确认调试参数仍仅由 `--qa-cdp` 显式启用；不把这项源码检查改写为运行时通过。记录见 [normal-launch-not-run.json](../evidence/optimization-20261013/normal-launch-not-run.json)。

## 复现与证据维护

```powershell
npm run typecheck
npm test
npm run build
npm run bundle:check
# 构建完成后再启动 E2E；每轮使用一个新目录。
$env:ISLAND_E2E_EVIDENCE_DIR = 'evidence/optimization-new-run'
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml --lib --release --locked
npm run desktop:build
```

Playwright 默认生成独立输出目录，JSON、截图、trace、test-results 都跟随该目录，默认不复用已有服务。端口被占用时失败，不终止未知进程。普通回归不依赖忽略目录中的旧源码。需要重做基线性能对比时，先执行 `npm run profile:baseline`，再显式设置 `ISLAND_PROFILE_BASELINE=1`；该命令只把固定基线源码复制到受忽略的证据目录。

原生 QA 只使用 `scripts/optimization-qa.ps1` 创建并校验的自有应用/服务器/端口，结果写入调用者指定的新证据目录。`Stop` 只停止 PID、启动时间、路径均匹配的自有进程。QA 清理不是正常退出或内存擦除验收。

开发过程的失败均保留：初次单测夹具时间戳问题、两轮新浏览器夹具/同步问题、原生阅读测试的收集语法错误、立即遮罩的真实 RED、以及旧 EXE 来源窗口未被同一 CDP 端点枚举的观察失败。详见 `RESULTS.json` 中的 `preservedFailures`。后续通过记录没有覆盖或重命名这些失败。
