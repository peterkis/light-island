# 当前 UI、动效与原生窗口约束

修改视觉、动效、窗口区域或输入行为时读取。当前临床视觉以不可变 [Windows UI/UX v1.0](<../Windows 灵动岛 UI UX 设计规范 v1.0.md>) 为准；检验阅读器按其两份 [设计输入](../LAB-READER-IMPLEMENTATION.md) 的独立约束和用户已明确的无水印选择执行。

## 当前临床形态与动效

- 从原规范第 12 节生成 tokens，保留源 SHA256；不手改原文或把适配解释变成第二份设计权威。[实现解释](../UIUX-V1-IMPLEMENTATION.md) 保存偏差与限制。
- S0 body 124×32，外耳 10 DIP；S1 268×36、中央空白 124；Minimal 36；Alert 372×88；Rich 372×168；Stack 400×≤280。来源长详情使用独立滚动面板；检验阅读阶段有独立尺寸，不能套普通 Rich 高度。
- 空 S0 hover 保持原尺寸、纯黑和 `cursor:pointer`，不加灰底、横线、亮框或 Peek；键盘焦点仍可见。活动 Compact 和检验 alert 保留规定的有限 Peek。见 [视觉修复](../UIUX-REFINEMENT-20261013.md)。
- 默认 Notch 主屏顶部居中、零间隙；旧 top-offset 不能使默认岛下移。Floating 按 v1.0 的独立偏移规则。按逻辑尺寸配置，实际像素坐标和 DPI 另测。`.ci-anchor` 内 200%/225% 必须改变计算字号和可达性。
- 形状由有界数值弹簧独占，重定向继承位置/速度；GSAP/useGSAP 只管理有限内容过渡。React 只声明 SVG 初值，不覆盖正在动画的 width/height/viewBox/path。
- 通用内容按规范 .96→1 入场；检验阅读器不缩放。数字只滚动变化位，200ms 后停止；悬停、采样和装饰不创建空闲循环。相同尺寸切换也必须揭示并解锁新内容；对象/授权改变重置 panel 所属。
- 保留独立 outgoing 内容，但权限收紧立即移除敏感 DOM。离开收起过程不重播退出；中断、反向、卸载和 StrictMode 清理全部动画上下文/监听。

## 生效动效策略

读取 [动效恢复说明](../MOTION-RESTORE-20261013.md)。诊断先记录应用枚举、应用 reduced、media、Windows 查询是否成功及最终原因，不能从安装了动画库或有 rAF 推断实际完整动效。

- 新安装跟随系统；首次偏好/Windows 状态未确认以及查询失败时保持 reduced。`SystemParametersInfoW` 必须成功且输出非零才算启用。
- 明确的每应用 `full` 可覆盖系统减少动态，不修改 Windows；已有应用 reduced 始终优先。CSS 与 JS 使用同一结果，设置显示原因。
- 工作台动效选择器只作用于自己的预览，与实验目标独立。两应用配置目录各自保存枚举；临床 WebView 保持临时 profile。
- focus 和恢复 visible 时刷新平台状态，合并单个在途查询、拒绝迟到结果并清理监听；不加入轮询。

## HWND、轮廓与输入

- 普通点击、hover、展开/关闭保持固定 render canvas/HWND；显示环境变化可重算。画布不是输入矩形，透明区不应成为整块挡板。
- 有限动画允许单在途 previous/next HRGN 交接，准备区域后才呈现；epoch、sequence、完成、取消和超时双侧保护。旧 epoch 不得影响当前表面。
- HRGN 保留 2 个物理像素 AA fringe，按实际 client width/DPI 映射；不能精确切可见曲线来掩盖亮边。`SetWindowRgn` 成功后才转移所有权给 OS；失败由本地释放。
- 有限交接并集及 AA 边缘仍可能覆盖透明像素并拦截点击；证据中说明这项保守余量，不宣称过渡逐像素穿透。
- 比较实际物理矩形，未变时跳过 `SetWindowPos`。保留现有 Rust 区域/阴影优化、RAII 和不对称浮点边界的正确回退；同步原生命令留在现有 UI 线程。
- 首次区域安装和 show 后刷新 native chrome；同时验证窗口样式与明暗底板的实际像素。透明配置不证明运行时无 `WS_CAPTION`/`WS_THICKFRAME`。
- 阴影可由独立非激活 `WS_EX_LAYERED|WS_EX_TRANSPARENT` 窗口绘制，不扩张输入区域。通知与 capture 不获取键盘焦点；明确用户点击/来源打开可按其路径激活。
- 不增加永久鼠标轮询、空闲 FPS 循环、全窗口 blur。亮度采样仍有界、单在途、在隐私/隐藏/动画时按既有条件暂停。Tailwind 保持 opt-in，不对旧 studio 开全局 preflight。

## 仅在维护 legacy 时读取

历史 capsule 为 56 DIP / radius 28，仅横向展开；历史 U-notch 为 160×34、hover +10×3、通知最高 56。临床默认已被 v1.0 覆盖，不回滚到旧 7-DIP 耳角或 540ms 形状 easing。

legacy 消息中心和 thread 导航保持横向，保留其回执、隐私、优先级和点击穿透。Motion mini/CSS 仍为比较路径，没有测量理由不引入大型动画运行时。

legacy 的 compactCanvas 在 begin/commit 共用几何推导值，包含 overshoot/reversal、可用宽度和物理 AA/舍入余量，不是固定 178×41 或 target.width+8。稳定 SVG sensing 必须穿过 content replacement/inert。CSS 交接使用临时隐藏测量元素，settle/cancel/unmount 清除；内容过渡结束后才恢复 micro-hover。

维护这些路径先读 [hover 稳定性](../HOVER-STABILITY-FIX.md)、[点击连续性](../CLICK-FLICKER-FIX.md) 与 [旧轮廓说明](../NOTCH-MOTION-UPDATE.md)。更早的 shrink-at-rest、临床静态 fallback 及旧尺寸仅用于理解历史事故。
