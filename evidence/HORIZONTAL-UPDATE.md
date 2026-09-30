# 2026-09-26 · 贴顶与横向胶囊修复

本记录描述本轮实际代码与验收；旧版 VALIDATION.md 的纵向几何属于历史版本。

## 实现
- 所有状态固定 56 DIP 高、28 DIP 圆角，只改变宽度，保持中心轴不动。
- 默认宽度：待机 192、轻提示 600、详情 920、消息中心/脉络 1000、成功 500 DIP；窄容器自动收窄。
- 主显示器采用屏幕边界定位，不采用工作区边界；原生窗口与胶囊内容顶部均为 0。
- 清除旧顶部间距偏好的影响。缩放变化时重新定位；没有持续鼠标位置轮询。
- Win32 HRGN 保留曲线外 2 个物理像素余量，让 WebView2 的半透明抗锯齿像素完整参与合成。
- 消息中心与协作脉络改为横向逐项浏览；确认、重试、隐私遮罩和危急优先级规则保留。

## 已执行
- TypeScript / Vite：通过，见 horizontal-build-test.log。
- 单元测试：36/36 通过，其中 14 项覆盖横向几何。
- Playwright：最终完整回归 14/14 通过，见 horizontal-e2e-final.log。
- 首轮回归有 1 项交互时序失败；测试补充等待两条消息完成入队后，完整回归通过。早期失败日志保留，不替代最终结果。
- Tauri Release：构建成功，见 horizontal-desktop-build.log。
- 原生三主题 × 待机/详情：6 组均贴顶、主屏居中、56px 高。
- 每组检测到 188 个半透明边缘像素；当前原生裁切截掉 0 个；同一图像套用旧紧贴圆角区域会截掉 144 个。
- 原生实际鼠标点击：透明区域下方测试按钮收到点击；胶囊内部可交互；普通/危急推送均不抢前台焦点。
- 原生确认操作获得模拟服务端回执；无 WebView 运行时错误。

## 动效采样
Motion mini：约 60.00fps，P95 16.9ms，>25ms 0 帧；CSS：约 60.00fps，P95 16.9ms，>25ms 0 帧。
两组各采样约 6.2 秒，全程高度偏移 0、顶部间隙 0，中心漂移小于 0.01px。

上述 FPS 是当前 Windows / WebView2 的 rAF 节奏采样，不等于 DWM 实际呈现帧率保证；本轮未完成 Windows 10 与全部 DPI/多屏组合验证。
保留 2 个物理像素透明边缘余量用于抗锯齿，它不是可见描边；更远的透明区域仍可穿透。

## 证据与复测
- horizontal-native-validation.json：原生几何、抗锯齿像素、回执与动效。
- horizontal-native-window-checks.json：原生焦点、透明区实际点击与位置。
- horizontal-native-desktop.png：合成测试窗口上的真实桌面效果，无临床数据。
- horizontal-native-{ink,cloud,dusk}-{compact,expanded}.png：WebView2 透明截图。
- scripts/qa-horizontal-native.mjs：仅在显式 --qa-cdp 启动后连接专用测试端口。
- scripts/qa-horizontal-windows.py：真实 Windows 命中、焦点和背景按钮点击。
- scripts/probe-horizontal-region.py：检查当前 HRGN 是否截掉截图中的抗锯齿像素。

备份：evidence/backups/before-horizontal-20260926-170652.zip。
当前仍仅为模拟原型；收到回执不代表临床处置，原有可靠投递与生产部署边界不变。
