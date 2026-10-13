# Rust 性能诊断与优化（2026-10-13）

本轮使用 `rust-best-practices`，以开始时**已有 TypeScript/React 优化的工作区和 Release EXE**为基线。性能验证结束时尚未提交或推送；后续根据用户“提交并推送”指令发布代码、报告和合成证据。没有升级依赖、修改 release profile、用户设计输入或临床业务协议。最终原始结果与源码哈希见 [RESULTS.json](../evidence/rust-optimization-20261013/RESULTS.json)。

结论：原生轮廓构建和阴影栅格计算的分配量、CPU 计算耗时均有可复现的局部收益。整应用交互受 IPC、Windows 调度和绘制影响，本轮没有证明整体交互或冷启动获得同等比例的改善。

## 诊断与实现

| 热路径 | 原有工作 | 本轮实现 |
| --- | --- | --- |
| 临床轮廓 | 深拷贝已提供的多边形；2 物理像素 fringe 的每个偏移均重新分配点数组、栅格化并创建 HRGN | `Cow` 借用已有多边形。每个轮廓仅创建一次 polygon HRGN，使用整数 `OffsetRgn` 完成相同的 25 个位置并集；临时区域由 RAII 释放 |
| 原生阴影 | 左右像素分别计算相同的距离场；每次重绘分配两份高斯查找表 | 对称边界只计算半边并镜像最终像素；固定小数组取代两次堆分配。浮点舍入造成边界不对称时保留完整循环 |
| 性能诊断 | 正常启动仍会先构造随后丢弃的 `clinical-layout` JSON；只有整体调用时间 | 仅在已有 `--hover-diagnostics` 模式构造该记录，增加准备、区域、阴影和原生合计耗时。记录仍有界、仅在内存保存，没有后台采样任务 |

区域优化保留原有物理坐标舍入、winding 填充、2 像素 AA fringe、previous/next 并集、实际 client width 和 epoch/sequence 规则。它复用临时 polygon，目的区域仍由原有 `SetWindowRgn` 成功路径交给 OS。没有新增 HWND 调整、矩形命中区域、焦点获取或临床写操作。[OffsetRgn](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-offsetrgn) 和 [CombineRgn](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-combinergn) 的返回值均检查失败。

亮度采样的整机调用约 16.6–16.8 ms；本轮没有测得改写其颜色计算能改善桌面读回。保留一次有界 BitBlt、仅返回平均亮度、动画/隐私时跳过、不保留桌面像素的机制。共享 WebSocket、64 项内存队列及只读路由也保留，未为微小的原子操作或 `Arc` 克隆增加结构。

## Release 隔离基准

同一进程中交替运行冻结的原算法和当前实际内核，各 9 轮。使用应用的 `opt-level=s`、thin LTO、8 个 codegen units、panic abort。阴影每轮每种实现 24 次；轮廓每轮 128 次。每行是**轮均值的中位数**，单位 ms；不是单次调用 P95、FPS 或整应用提速。[原始样本](../evidence/rust-optimization-20261013/microbench-final.jsonl)、[汇总](../evidence/rust-optimization-20261013/microbench-final-summary.json)。

| 内核/模拟坐标缩放 | 原算法 | 本轮 | 耗时减少 |
| --- | ---: | ---: | ---: |
| 阴影 / 1.0 | 4.457 | 2.471 | 44.6% |
| 阴影 / 1.5 | 6.594 | 3.625 | 45.0% |
| 阴影 / 2.0 | 10.585 | 6.249 | 41.0% |
| 两份轮廓交接 / 1.0 | 1.199 | 0.711 | 40.7% |
| 两份轮廓交接 / 1.5 | 1.452 | 0.923 | 36.4% |
| 两份轮廓交接 / 2.0 | 1.910 | 1.325 | 30.7% |

两份 128 点轮廓内核的 Rust 分配次数从 **50 → 2**，请求的字节数从 **51,200 → 2,048**，均减少 96%。这些计数不包含 Tauri 反序列化、原有多边形深拷贝或 GDI 内部分配；借用进一步去除了原有深拷贝。阴影查找表堆分配从 **2 → 0**，8,208 B 改为短暂栈上数据，没有新增位图或像素缓存。

缩放参数是算法输入，**不是物理多 DPI 设备验收**。机器负载明显影响绝对时长，原始样本包含离群轮次；保留所有轮次，不把首次较快样本作为最终收益。

## 原生应用测量

Windows 本机 96 DPI、Release、独立临时 WebView2 profile，无 studio。每类预热后采集 3 轮、共 72 次调用；包含 IPC 和显式开启的诊断开销。[基线重测](../evidence/rust-optimization-20261013/native-baseline-recheck/rust-native-cost.json)、[最终 EXE](../evidence/rust-optimization-20261013/native-delivery/rust-native-cost.json)。

| 调用 | 基线中位数 ms | 最终中位数 ms | 解释 |
| --- | ---: | ---: | --- |
| 未修改的 metrics 对照 | 1.3 | 1.3 | 该两组调用的对照成本接近 |
| 单轮廓、无阴影 | 2.2 | 1.7 | 有限本机观察 |
| previous/next 交接 | 2.5 | 2.2 | 约减少 12%，不是完整用户交互时间 |
| 缓存阴影 | 2.6 | 2.3 | 仍包含区域和 IPC |
| 变化轮廓与阴影 | 6.9 | 5.3 | 约减少 23%，不是 DWM 呈现延迟 |
| 亮度采样 | 16.8 | 16.6 | 变化很小，未优化该路径 |

首次两个候选运行曾测得交接 5.9/4.4 ms、重绘 14.0/12.1 ms，第二次的未修改 metrics 也升至 3.1 ms。它们完整保留于 `native-final/`、`native-final-recheck/`；不能忽略这些结果或宣称所有启动都更快。分段诊断另见最终调用数据中的 `native` 字段，其计时从 Rust 命令函数体开始，到诊断 JSON 构造之前结束，包含 Windows API 等待；不等同于纯 CPU 时间，也不覆盖 IPC 解析。

进程树内存采样覆盖 Rust 主进程和所有发现的 WebView2 后代，排除合成 Node 服务、QA 工具和 witness。样本见最终 `native-delivery/process-tree.json`。短样本不足以建立整应用内存改善；不以 Rust 主进程内存或分配减少百分比冒充总内存减少。

## 等价与回归

新增 5 项 Rust 测试：126 组状态/透明度/缩放的位图逐像素对照；60 组整数附近 ULP、奇偶宽度对照；非法位图尺寸拒绝；24 组不同 fringe/缩放的旧/新/S2 分离区域并集等价；128 次失败并集后的 GDI 句柄数量不变。原有 8 项 Rust 测试继续通过。被冻结的原算法只进入测试和独立 benchmark，不进入应用 Release 产物。

额外边界测试先捕获了本轮镜像实现的一个真实 RED：200% 算法坐标、`372.0` 上方一个 ULP 时，两端 floor/ceil 的原始范围不完全对称，多写了一个阴影像素。现在检查两端范围是否对称，不对称时回到完整循环。失败及修复记录见 [RESULTS.json](../evidence/rust-optimization-20261013/RESULTS.json) 的 `preservedFindings`；本地原始输出分别保留在 `differential-boundary-red.log`、`differential-final.log`。

| 检查 | 结果 |
| --- | --- |
| Rust Release / locked | 13/13 PASS |
| Clippy all-targets / all-features / locked | `-D warnings -D clippy::perf` PASS |
| TypeScript/React 单测 | 231/231 PASS，12 个文件 |
| 类型检查、token 生成、前端构建 | PASS |
| 桌面 Release 构建 | PASS |
| 浏览器全量回归 | 93/93 PASS；0 skipped、0 unexpected、0 flaky |
| 最终 EXE 原生回归与屏幕连续性 | 4 次开合，SVG viewport 错位 0、HWND 改变 0、静止区域更新 0；55 张屏幕采样无整体空白；3 次 witness 穿透点击、通知不抢焦点通过 |

最终原生观察为 `PASS_WITH_LIMITED_SOURCE_OBSERVATION`：模拟来源窗口存在，但独立 WebView 未被该 CDP 端点枚举，来源内容启动耗时未测；来源截图因未满足可见/前台条件也为 NOT_RUN。正常动态原生路径为 NOT_RUN，当前机器启用了系统减少动态。rAF P95 为 17.0–17.1 ms，记录的是浏览器回调 cadence。

最终 EXE SHA256：`40cd4d13c79c2e050e3d2be0d3bd5939e3f1ec30d80c2d4fefdc9374e622bd0c`。222 个验证起点文件哈希无漂移，211 个本轮未编辑的已有文件保持原字节。三份不可变设计输入与 Git 内容一致。原始 RESULTS.json 保留提交前状态；验证时已有 TS/React 工作被记录为 `7ac2cf2`，本轮以工作区快照区分两轮改动。

提交发布遵循仓库的 `*.log`、`evidence/**/temp/`、`evidence/backups/` 忽略规则。原始运行日志、EXE、PDB 和临时 WebView2 数据留在本地；发布 JSON/JSONL 原始样本、结果清单、源码哈希和合成截图。新增的 `.gitattributes` 规则保留本轮已发布证据的原始字节，不改变测量记录。

基线严格 Clippy 的 5 项诊断留在 `clippy-baseline.log`。修正了原有格式歧义、raw pointer 比较和两处多余 return；保持现有 Tauri 参数契约，对 15 参数命令只添加带理由的局部 `#[expect(clippy::too_many_arguments)]`，未全局关闭警告。

## 复现

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --release --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings -D clippy::perf
rustc --edition=2021 -C opt-level=s --test scripts/rust-native-bench.rs -o src-tauri/target/rust-differential.exe
& src-tauri/target/rust-differential.exe
rustc --edition=2021 -C opt-level=s -C lto=thin -C codegen-units=8 -C panic=abort scripts/rust-native-bench.rs -o src-tauri/target/rust-native-bench.exe
& src-tauri/target/rust-native-bench.exe
npm run desktop:build
# 选择一个尚不存在的新目录；QA helper 校验进程、启动时间、路径和端口归属。
powershell -NoProfile -File scripts/optimization-qa.ps1 -Action Start -Output evidence/rust-qa-new-run -Executable src-tauri/target/release/samewave-island.exe
$env:ISLAND_QA_OUTPUT='evidence/rust-qa-new-run'
node scripts/qa-rust-native-cost.mjs
powershell -NoProfile -File scripts/optimization-qa.ps1 -Action Stop -Output evidence/rust-qa-new-run
```

本轮运行在系统减少动态路径。浏览器普通弹簧回归与原生减少动态观察分开记录；不把它们改写成原生正常连续变形通过。DWM 实际呈现、Windows 10、物理 125%/150%/200% 与混合 DPI、讲述人、触摸矩阵均未验收。强制停止自有 QA 进程也不是正常退出、profile 清理或内存擦除保证。
