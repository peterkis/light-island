# 同频 · U 形刘海与分层动效更新

更新日期：2026-09-30。此文替代 9 月 26 日“所有默认状态固定 56 DIP”的几何约定；等高胶囊仍可作为对照。

## 产品边界
默认 U 形：待机 160×34 DIP，悬停 170×37，通知 560×56，重点通知 880×56，消息中心/脉络 980×56。尺寸随可用宽度收敛。主屏顶部物理 Y=0、水平居中。通知仍是横向短条，不恢复垂直大面板。
选“等高胶囊”可保留所有状态 56 DIP 的旧交互方向。所有示例为模拟数据，收到回执不代表临床处置。

## 本轮实现
- GSAP 3.15.0、@gsap/react 2.1.2；移除未使用的 Motion 依赖。Tailwind 4.3.3 只引入 theme/utilities，不加载 Preflight 改写旧试验台。
- `src/hooks/useMorph.ts` 将业务状态与显示状态分离。旧内容冻结并退出，新内容按图标/正文/操作分层进入。
- 外壳扩展延后约 25ms 开始，约 540ms 收敛。内容在约 55ms 切换，整体/正文/操作分别在约 60/80/120ms 开始入场。
- 收起先让旧内容在约 55ms 内退场，外壳约 70ms 后开始 340ms 回缩，待机内容随后进入。字体不做缩放，不对可读文字应用模糊滤镜。
- CustomEase 由轻微欠阻尼响应采样，阻尼比 0.84。仅宽度有一次小幅超调，高度用单调缓动。不是“超阻尼同时回弹”，也不是对 iOS 参数的精确反推。
- 动画可中断：新状态从当前几何接续，取消旧上下文/观察器/兜底计时器。epoch 防止旧原生提交覆盖新状态。
- `useGSAP` 管组件卸载清理，每次过渡的独立 context 主动释放，避免把持续交互的所有历史动画保存在一个长期 context 内。
- React StrictMode 下的连接清理增加 generation 隔离，旧连接的晚到清理不能清空新 sender。
- 系统减少动态设置变化会立即生效；关闭回弹与悬停形变，保留内容、交互和回执。不常驻帧率监测、不轮询鼠标。
- 原型试验台按需加载，常驻岛窗口不主动加载 Studio 组件。

## 曲线、原生区域与 DPI
`src/lib/geometry.ts` 是 SVG 路径和原生多边形的共同几何源。上方两侧为反向小圆弧，下方使用两段三次曲线柔化；这是拟合设计，不宣称完全复刻 Apple 的连续曲率公式。
`NotchSurface.tsx` 绘制抗锯齿底色和细描边；内容裁切与表面分离。Windows 区域保留向外 2 个物理像素的余量，不能再用硬圆角区域紧贴可见曲线裁剪。
原生后台窗口从旧 1100×80 改为动态外接范围。当前 100% 缩放下，待机 HWND 为 168×38，重点通知为 888×60。一次过渡只在开始预留范围、结束收紧窗口；不逐帧修改 HWND 尺寸。
`SetWindowPos` 一次设置大小、位置和置顶，并使用 NOACTIVATE。主显示器策略仍以 primary_monitor 的物理位置和缩放因子为准，不以任务栏工作区或鼠标所在显示器替代主屏。

## 明确取舍
1. 动画期间原生区域是当前与目标尺寸的窄外接范围；收敛后恢复精确轮廓穿透。因此过渡约 0.6 秒内，短条包围范围内的透明小区域可能拦截点击。没有将该阶段描述为逐像素穿透；长期闲置不会保留全屏或大面积透明遮挡。
2. 保留不透明深色渐变与细描边，不使用 `backdrop-blur-xl` 假装实现 Windows 桌面磨砂。WebView 内的 CSS 背景模糊不是 DWM 跨应用模糊。大面积阴影也未纳入本轮原生命中区域，避免重新制造透明挡板。
3. “原生 CSS”开关对比的是外壳尺寸路径；内容时序仍由 GSAP 统一调度，并非整个客户端不加载 GSAP。
4. 当前实际机器是 Windows 11；浏览器 DPR 1.25/1.5/2 的回归只说明浏览器栅格缩放，不替代 Windows 10、真实 OS 缩放切换或混合 DPI 多显示器验收。
5. Native rAF 采样是 WebView 调度节奏，不是 DWM PresentMon 呈现证明。渲染路径更复杂、GPU 和终端不同仍可能卡顿。

## 核心文件
- `src/components/Island.tsx`：保留横向通知、消息浏览、脉络、隐私与收到回执。
- `src/components/NotchSurface.tsx`、`src/notch-motion.css`：U 型曲线和分层外观。
- `src/hooks/useMorph.ts`、`src/lib/geometry.ts`：过渡、曲线、最新状态获胜。
- `src-tauri/src/notch_window.rs`：受限的几何 IPC、主屏贴顶、区域所有权及物理像素余量。
- `tests/notch-motion.spec.ts`：退出、中断、减少动态、旧胶囊与 DPR 回归。
- `scripts/qa-notch-native.mjs`、`qa-notch-windows.py`：原生形态、抗锯齿、帧间隔、焦点与真实鼠标点击验证。

## 官方依据
- GSAP React / useGSAP 与异步动画清理：https://gsap.com/resources/React/
- GSAP CustomEase：https://gsap.com/docs/v3/Eases/CustomEase/
- Windows SetWindowPos / NOACTIVATE：https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowpos
- Windows SetWindowRgn / 系统接管 HRGN：https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowrgn
- Tauri WebviewWindow：https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html

本轮没有复制候选项目源码，没有注册开机启动、调整系统 DPI、安全策略或连接真实医院系统。验证完成后应退出仅用于自身测试的 --qa-cdp 进程，并按正常参数重新启动。

???????Vite ?? Rust ???????????????????? Windows ??? EXE ?????? EBUSY ?????????Tailwind ?????????????????????????https://v2.tauri.app/start/frontend/vite/ ? https://tailwindcss.com/docs/detecting-classes-in-source-files
