# 按改动选择验证与证据

命令来源是 [package.json](../../package.json)、[Playwright 配置](../../playwright.config.ts) 及 [原生脚本入口](../../scripts/README.md)。先运行已有检查，避免另造等价测试系统。

## 选择检查

| 改动 | 必要检查 |
| --- | --- |
| 指令、索引、复盘 | `npm run instructions:check`；改检查器时跑其单测和 typecheck |
| TS/React/Node 或一般可发布候选 | `npm run check`：输入/导航检查、单测、Node 协议夹具、完整前端 build/typecheck、来源/应用 bundle 边界 |
| 交互、来源失效、动效、目标隔离 | 构建完成后运行 `npm run test:e2e` 或明确列出的相关用例；记录实际匹配数量 |
| Rust/协议跨语言行为 | 两工程适用的 Cargo test/Clippy；协议改动对照同一 golden fixtures。仅 `test:protocol` 不证明 Rust 已运行 |
| 原生行为、打包、启动 | `npm run desktop:build`；两个 EXE 的独立启动/退出、不同顺序、重启、崩溃、端口冲突及协议不兼容；加实际桌面 QA |
| 性能 | 相同基线/候选/模式与机器条件；按所改热路径追加有限测量，不重复跑无关大矩阵 |

前端 CI 定义在 [validate.yml](../../.github/workflows/validate.yml)，运行 `npm run check` 并核对生成 tokens 无差异。它不包含桌面屏幕验收，也不替代两套 Rust 检查。目前没有自动安装本地 Git hook。CI 配置文件存在不等于远端已成功执行。

```powershell
cargo test --manifest-path src-tauri/Cargo.toml --lib --release --locked
cargo test --manifest-path workbench/src-tauri/Cargo.toml --lib --release --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings -D clippy::perf
cargo clippy --manifest-path workbench/src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings -D clippy::perf
```

仅文档修改不重建多 GB Rust 缓存。构建 OOM 时保存失败日志，读取系统提交量和自有任务并发；必要时 `CARGO_BUILD_JOBS=1` 串行重试。资源条件未改变时不要连续重跑，更不要结束无关进程或修改全局系统设置。

## 浏览器与夹具

- 使用安装的 Chrome 和隔离测试 profile。默认不复用服务器；先核实端口占用，隔离来源/legacy/web 端口用配置中的 `ISLAND_TEST_SOURCE_PORT`、`ISLAND_TEST_LEGACY_PORT`、`ISLAND_TEST_WEB_PORT`。
- 测试与会写 tokens/源码的构建顺序执行；并行写文件可触发 Vite HMR，污染挂载与时序。
- 新测试先确认目标状态实际成立：报告用专属 replay/variant，不能用普通 S04 假定生成阅读会话。等待 WS 状态进入页面后再推进虚拟时间。
- 虚拟 clock 在页面初始化前安装，暂停点留够通信余量；不用固定 sleep 代替状态断言。区分 SETUP_FAILURE、真实 RED 和修复后的 GREEN。
- npm 参数转发不确定时用 `node node_modules/@playwright/test/cli.js test <file> --grep <pattern>`；先 `--list` 核实匹配，再运行并报告实际数量。
- 不把多次分段通过拼成“一次全量全绿”；旧的字体/卡片断言要迁移到当前规范，不能静默删除失败项。

## 自有原生 QA

用 `scripts/optimization-qa.ps1` 或拆分 QA 的所有权清单启动/停止。核实 EXE 路径与哈希、PID、启动时间、父子进程及监听端口；允许有限 SendInput/采样，不把测试采样加入应用循环。

- 正常启动不开 QA。显式 `--qa-cdp` 仅岛 9223 / 工作台 9224；`--qa-control` 才启用工作台 HTTP 测试接口。二级 WebView 共用 profile 时继承一致浏览器参数。
- 不连接用户既有浏览器 profile、无关调试端点；不为释放 17322/17321/9223/9224 停止未知进程。受占用的旧 EXE 先核实所有权和正常退出路径。
- 灰色背景框、两侧亮边、空 S0 hover 高亮各是独立案例；灰框先核实是否残留合成 QA 窗口，再验透明根/底板像素；另外核对窗口样式/AA、hover 计算样式/尺寸。再验真实点击穿透、通知前台焦点、SVG viewport/path 一致及阅读清理。
- 检查完整动效与 reduced 的实际生效信号。rAF/native IPC/实际屏幕连续性分别记录；有限截图不是 DWM 逐帧呈现证明。
- 统计每个应用的完整 Rust + WebView2 进程树，明确工作集/私有提交及采样时长；Rust EXE 单进程不是应用总内存。
- `--hover-diagnostics` 只显式、有限、内存内使用；QA 结束关闭自有进程、合成背景与端点。强制结束不等于正常退出、profile 擦除或内存擦除保证。

## 证据的完成条件

每轮使用新的 `evidence/<task>-<date>/`，汇总环境、源码/产物哈希、命令/退出码、模式、结果、失败与未测项；原日志可在忽略目录保存。历史 JSON、截图、规范与失败文件不重写。

PASS 只用于确实执行且符合断言的范围；保留 PARTIAL、RED、SKIP、NOT_RUN、NOT_REPRODUCED_HARDENED。自动审批拒绝只说明未执行，源码检查不能替代运行时通过。按当前环境重新判断权限，不继承历史拒绝为永久阻塞。

Windows 11/96 DPI 的本机观察、浏览器 DPR/文字缩放、算法坐标缩放各有不同意义。Windows 10、物理 125–200%/混合 DPI、触摸、Narrator、多屏热插拔、120Hz/DWM 和真实临床接入在没有新设备证据前继续未验收。
