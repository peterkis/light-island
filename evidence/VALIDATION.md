# 同频 Island 0.1 — 本机验收记录

日期：2026-09-26。目录：`D:\Projects\island-protype`。
环境：Windows 11 Pro 10.0.26200；16 个逻辑处理器；Node 24.18.0；Rust 1.94.0；Tauri 2.11.6；WebView2 153.0.4234.48。全部使用模拟消息。

## 已完成

| 项目 | 结果 | 证据 |
|---|---|---|
| TypeScript + Vite production build | PASS | desktop-build-release.log |
| Rust / Tauri Windows release build | PASS | desktop-build-release.log |
| 单元测试 | 22 / 22 PASS | unit-tests-final.log |
| Chrome 浏览器交互回归 | 10 / 10 PASS，46.3 秒 | e2e-console-final.log、playwright-results.json |
| 原生 Rust WebSocket → Tauri event → React | PASS | native-webview-validation.json |
| 原生确认按钮 → 服务器回执 → 成功状态 | PASS | receiptRoundtrip=true |
| 原生胶囊内部命中 | PASS | native-window-checks.json |
| 透明外部命中下方窗口，真实鼠标点击被下方按钮接收 | PASS | backgroundClickReceived=true |
| 普通/危急消息展开不切换原前台窗口 | PASS | routineFocusPreserved / criticalFocusPreserved |
| WebView2 本轮运行时异常 | 未发现 | errors=[] |

## 动效采样：真实原生 WebView2，不是浏览器预览

Release 应用，显式 `--qa-cdp` 本地调试连接；可见胶囊，在 compact/inbox 间每620ms切换。两引擎分别采样约6.2秒，去掉最初两个间隔后各372帧。
- Motion mini：平均60.00fps，P95帧间隔17.1ms，超过25ms为0。
- CSS：平均60.00fps，P95帧间隔17.0ms，超过25ms为0。

这是短时 requestAnimationFrame 调度节奏，不是 DWM/ETW 呈现帧分析；不能证明所有显卡、Windows版本、缩放比例和后台负载下稳定60fps。正常启动不启用9223端口。

## 空闲资源：正常启动，无调试端口、无试验台

在11:18:46前后，空闲胶囊启动稳定后采样约5.11秒。统计本应用和全部6个WebView2子进程，不包含Node模拟源、Chrome或构建进程。
- 私有工作集总和：**95.22 MiB**，见 native-private-working-set.json。
- 私有提交量：**158.97 MiB**；工作集加总：**346.73 MiB**，见 native-process-tree.json。工作集加总包含共享页，不能当作唯一物理内存增量。
- 该5.11秒采样窗口CPU时间增量为0；不代表永久零CPU，连接心跳和消息到达仍会执行。
- Release EXE：4,131,328 bytes；这是磁盘体积，不是运行内存。
- 最后前端完整JS：276.38kB / gzip88.72kB；CSS33.84kB / gzip8.18kB。

## 不能据此宣称通过的项目

Windows10真机、125%/150%/200%DPI矩阵、多屏/热拔插、锁屏/投屏隐私、长时间内存稳定性、真实网络故障矩阵、临床送达可靠性、身份/岗位鉴权、持久化补拉、处置升级链、安装器签名尚未验收。没有接入真实HIS/LIS/PACS，不可承担临床告警职责。

候选GitHub项目只做资料和关键实现方向核验，没有逐个构建后进行二进制性能横评。原型是独立实现，不复制GPL工程源码。早期构建/测试失败日志仍保留，最终状态以上述 final/release 文件为准。

## 启动入口复核

`start-prototype.cmd` 已实际执行；现有客户端保持单一进程，成功打开独立的原型试验台。原生试验台使用Rust通道并正常渲染，见 `12-native-studio-offscreen.png`。该图通过本应用窗口的离屏PrintWindow获取，不需要切换用户正在操作的前台窗口。普通启动的客户端与试验台保持运行，未开启QA调试端口。
