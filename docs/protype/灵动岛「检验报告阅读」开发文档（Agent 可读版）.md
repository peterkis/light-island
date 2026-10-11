# 灵动岛「检验报告阅读」场景开发文档（Agent 可读版）v1.0

*Dynamic Island · Lab Report Reader · Implementation Spec*

目标：在 Windows 真机上复刻已验证的 HTML 演示效果（形变动画、分层过渡、阅后即焚）。单位：DIP（100% 缩放下 1 DIP = 1 px）。带 ★ 的数值是演示中的取值，真机需校准。

## 0. 给实现 Agent 的说明

- 本文已内联全部尺寸、颜色、时序、算法、文案和示例数据，**不依赖**演示源码；数值以本文为准。
- 状态名、层名、token 名固定，不要改名：状态 `idle / alert / sum / read / burn / done`；内容层 `alert / sum / read / done`。
- 建议实现顺序：§3 几何 → §4 弹簧引擎 → §5 内容层过渡 → §6 各阶段 UI → §7–§8 阅后即焚与隐私策略 → §11 真机集成 → §14 验收。
- 技术栈无关：WebView2 / Tauri 可直接移植 HTML / CSS / JS，改动最小；Skia / Composition 原生实现见 §13。
- 冲突处理：§14 的验收标准优先于其他章节的描述。
- 与《Windows 灵动岛 UI/UX 设计规范 v1.0》的关系：该规范是通用设计体系，本文是它在「检验报告」场景的落地实例；演示取值与规范略有出入之处（高度弹簧刚度、圆角为普通圆弧等）已在 §15 标明。

## 1. 场景与产品决策

### 1.1 场景

检验科推送一份检验报告（链接）。用户点击岛上的通知后，要在不打断当前工作的前提下读完结果，读完即销毁。

### 1.2 展示形式对比与结论

| 方案 | 优点 | 问题 | 结论 |
| --- | --- | --- | --- |
| 普通 PC 窗口 | 信息承载最大，可打印 | 打断工作流；任务栏、Alt-Tab 留痕；窗口管理成本高；隐私残留 | 仅作为「完整报告」的升级路径 |
| 手机式圆角竖窗 | 视觉统一 | 像弹窗，丢失岛的连续感与物体感；浪费横向空间 | 不采用 |
| 同体变形 + 阅后即焚 | 不离开岛；渐进披露；隐私友好；动线最短 | 单屏信息量有限（约 8 项需滚动） | **采用** |

### 1.3 渐进披露三级

1. Notice（`alert`）：一行结论——「检验报告已出，3 项异常」。
2. Summary（`sum`）：异常项直接列为芯片，两个动作：阅读报告 / 稍后。
3. Reader（`read`）：同一个黑色形体长成阅读面板；异常项在前，每项带参考范围条；60 秒倒计时 + 水印 + 闲置遮罩；结束即焚毁，岛回到静默。

### 1.4 非目标

不对接真实 LIS；不持久化；不提供打印（走「完整报告」升级为 PC 窗口，由主应用实现）。

## 2. 系统总览

### 2.1 状态机

| 状态 | 含义 | 进入条件 | 离开条件（→ 目标） |
| --- | --- | --- | --- |
| idle | 静默胶囊 | 初始；alert 超时；点「稍后」；sum 状态下岛外点击；done 结束 1700 ms 后 | 事件到达 → alert |
| alert | 通知 | 事件到达（重播时延迟 520 ms） | 点击 → sum；停留 7 s 超时 → idle；Esc → idle |
| sum | 摘要 | alert 被点击 | 点「阅读报告」→ read；点「稍后」/ 岛外 pointerdown / Esc → idle |
| read | 阅读 | 点「阅读报告」 | 点「阅后即焚」/ Esc / 倒计时归零 → burn |
| burn | 焚毁过渡（不可打断，忽略一切输入） | read 触发焚毁 | 1100 ms 后 → done |
| done | 完成提示 | burn 结束 | 1700 ms 后 → idle |

规则：`burn` 期间 resize 事件不重算状态；replay 在 `burn` 期间被忽略。

### 2.2 结构（自上而下）

```
#dock            固定在视口顶部，flex 水平居中，pointer-events: none
└ #isl           黑色形体（宽/高/圆角由弹簧驱动），pointer-events: auto
  ├ ::before / ::after   Notch 模式的「耳朵」
  └ .in          裁剪层：position absolute; inset 0; overflow hidden; border-radius: inherit
    ├ .v[alert]  内容层
    ├ .v[sum]
    ├ .v[read]   （进入时动态写入 DOM，焚毁后清空）
    └ .v[done]
```

### 2.3 形体与内容分离（最关键的设计）

- **形体**：只有 #isl 的 width / height / border-radius 每帧变化，由弹簧积分驱动。
- **内容层**：宽高固定为「所属状态的目标宽高」，以形体顶边中心水平居中（`left:50%; margin-left: -宽/2`），被 `.in` 裁剪。形变过程中内容层**不重排、不缩放**，只是被「揭开」或「遮住」。
- 内容层的显隐只用 opacity / filter: blur / transform: scale，与形体动画相互独立。

## 3. 几何与尺寸

### 3.1 状态尺寸

令视口宽 vw、视口高 vh：`W = min(372, vw − 24)`，`R = min(400, vw − 16)`，`H = max(380, min(580, vh − 100))`。

| 状态 | 宽 × 高 | 底部圆角 r | 阴影档 | 形体弹簧 |
| --- | --- | --- | --- | --- |
| idle | 124 × 32 | 16 | 无 | collapse |
| alert | W × 88 | 36 | big | expand |
| sum | W × 200 | 40 | big | expand |
| read | R × H | 44 | big | expand |
| done | 210 × 36 | 18 | 无 | morph |

big 阴影：`0 12px 32px -4px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.3)`。所有状态叠加 hairline：`inset 0 0 0 .5px rgba(255,255,255,.10)`（仅暗色环境，亮色环境为透明）。★ 真机应按壁纸亮度自适应：亮度 < 0.15 才描边。

### 3.2 两种停靠模式

- **Notch（vw ≥ 640，默认）**：形体顶边贴视口顶（top = safe-area-inset-top），**顶部两角为直角**，仅底部两角为圆角 r；左右各加一只 10×10 的「耳朵」：
  - 左耳：`left:-10px; top:0; background: radial-gradient(circle at 0 100%, transparent 9.5px, #000 10px)`
  - 右耳：`right:-10px; top:0; background: radial-gradient(circle at 100% 100%, transparent 9.5px, #000 10px)`
- **Float（vw < 640）**：`margin-top: 8px`，四个角都是圆角 r，隐藏耳朵。

每次 `go()` 重新判断模式。

### 3.3 悬停 Peek

仅 idle 与 alert 状态（类 `pk`）：鼠标悬停时 `transform: scale(1.045)`，`transform-origin: 50% 0`，过渡 `.36s cubic-bezier(.34,1.56,.64,1)`（带过冲的贝塞尔，近似弹簧）。其余状态不放大。

## 4. 弹簧引擎（形变动画核心）

### 4.1 参数

质量 m = 1。宽度 w、高度 h、圆角 r 各有一个弹簧；**目标值变化时只改 target，保留当前位置 x 与速度 v**（速度继承）。

| 弹簧 | k（stiffness） | c（damping） | ζ | 峰值过冲 | 用于 |
| --- | --- | --- | --- | --- | --- |
| expand | 190 | 22 | 0.80 | ≈ 1.6% | 进入 alert / sum / read 时的宽度与圆角 |
| collapse | 260 | 28 | 0.87 | ≈ 0.4% | 进入 idle 时的宽度与圆角 |
| morph | 320 | 26 | 0.73 | ≈ 3.6% | 进入 done 时的宽度与圆角 |
| height | 210 | 23 | 0.79 | ≈ 1.7% | **所有**转换的高度 |

注意：演示里高度始终用 k=210、c=23（比宽度略硬），展开时会有「先宽后高」的有机感。★ 若希望收起时高度也走 collapse 弹簧，需单独调参（见 §15）。

### 4.2 积分与停止条件

```
dt = min(真实帧间隔, 1/30)           // 秒
a  = -k * (x - target) - c * v
v += a * dt;  x += v * dt            // 半隐式欧拉
静止判定：w、h、r 三个属性同时满足 |v| <= 0.05 且 |x - target| <= 0.05
静止后：x = target, v = 0，并停止渲染循环（按需渲染）
```

启动：循环未运行时，先令 `last = 当前时间戳`，再请求下一帧，避免首帧 dt 过大。

### 4.3 每帧写入形体

```
topR = isFloat ? r : 0
width = w px;  height = h px
border-radius = topR topR r r     // 左上 右上 右下 左下
```

圆角会在弹簧中过冲，浏览器按比例钳制；原生实现需自行 clamp 到 min(w, h) / 2。

### 4.4 预期手感（用于验收）

- idle → alert：宽度位移 248，高度位移 56；2% 稳定时间 ≈ 0.36 s；宽度峰值过冲 ≈ 4 px。
- 任意中途反向（例如展开到一半收起）：从当前位置与速度继续，**不得**出现跳变或重置。

## 5. 内容层过渡（编排）

### 5.1 层的显隐

```
关闭态 .v     : opacity 0; filter blur(10px); transform scale(.97); pointer-events none
                transition: opacity .12s cubic-bezier(.4,0,1,1), filter .12s, transform .12s
开启态 .v.on  : opacity 1; filter none; transform none; pointer-events auto
                transition: opacity .32s E .09s, filter .32s E .09s, transform .32s E .09s
E = cubic-bezier(.2,.8,.2,1)
```

即：**内容先消失（120 ms），后出现（延迟 90 ms，历时 320 ms）**；任一时刻只有当前状态对应的层带 `.on`。

### 5.2 子元素错峰（.st）

```
关闭态 .st       : opacity 0; transform translateY(8px); transition opacity .15s, transform .15s
开启态 .on .st   : opacity 1; transform none;
                   transition opacity .42s E, transform .42s E，延迟 = 90ms + i × 40ms
```

各层子元素的序号 i：

| 层 | i = 0 | i = 1 | i = 2 | i = 3 |
| --- | --- | --- | --- | --- |
| alert | 图标块 | 标题 | 副标题 | 右侧箭头 |
| sum | 顶行（图标 + 科室 + 时间） | 标题块 | 芯片行 | 按钮行 |
| read | 头部 | 「异常 N 项」分节标题 | （空缺） | 异常行 1 |

read 层的完整序号序列（演示数据：3 项异常 + 5 项正常）：头部 0；「异常 3 项」分节标题 1；异常行 3、4、5；「其余 5 项正常」分节标题 6；正常行 7、8、9、10、11。生成规则见 §12.2。

### 5.3 时间线示例

| 时间（自触发起） | alert → sum | sum → read |
| --- | --- | --- |
| 0 ms | 形体开始 expand 弹簧；alert 层开始淡出（120 ms） | 同左；sum 层淡出 |
| 90 ms | sum 层开始淡入 / 去模糊（320 ms） | read 层开始淡入 |
| 90 + 40·i ms | 子元素依次上浮 | 同左 |
| 350 + 50·i ms | — | 范围条圆点开始滑向各自位置（历时 900 ms） |
| ≈ 360 ms | 形体进入目标 2% 范围 | 同左 |

### 5.4 参考范围条圆点

`.dot` 初始 `left:0`；所在层开启后 `left: var(--p)`；过渡 `left .9s E`，延迟 `350ms + i × 50ms`（i 为该行序号）。圆点只在层带 `.on` 时才移动，所以每次重新进入阅读都会重新「滑入」。

## 6. 各阶段 UI 规范

### 6.1 通用 token

- 字体栈：`Segoe UI Variable Text, MiSans, HarmonyOS Sans SC, Segoe UI, PingFang SC, Microsoft YaHei UI, system-ui, sans-serif`；全局 `font-variant-numeric: tabular-nums`。
- 颜色（岛内固定深色）：形体 `#000`；主文字 `#fff`；次文字 `rgba(235,235,245,.6)`；控件填充 `rgba(255,255,255,.14)`（hover `.20`）；卡片 `#1C1C1E`；蓝 `#0A84FF`（hover `#2e93ff`）；红 `#FF453A`；橙 `#FF9F0A`；绿 `#30D158`。
- 字阶（字号/行高，字重，字距）：Title 15/20 600 −.2px；Title-L 17/22 600；Body 13/18 400；Body-Strong 13 600；Caption 11/14 500 +.1px；检验数值 18/22 600 −.3px。
- 图标：24 网格，线宽 1.75，圆头圆角，`currentColor`。

### 6.2 alert（W × 88）

- 布局：横向 flex，垂直居中，`padding: 0 20px`，`gap: 12px`。
- 图标块：44×44，圆角 10，背景 `linear-gradient(145deg, #3b9bff, #14c4bd)`，内含 24 的烧杯图标（白色）。
- 文字块（flex:1，min-width:0）：标题「检验报告已出」（Title）；副标题（Body，次文字色，单行省略）：「血常规 肝功能 CRP」+ 一个全角空格 + 「3 项异常」（橙色，600）。
- 右侧：18×18 的右箭头（次文字色）。
- 交互：整个岛点击 → sum；悬停 Peek；停留 7 s 自动收起。

### 6.3 sum（W × 200）

- 内边距 `16px 20px`；纵向 flex，`gap: 12px`。
- 顶行：20×20 小图标块（圆角 5，同上渐变，内含 12 的烧杯）+ Caption「检验科 LIS」+ 右端 Caption「刚刚」。
- 标题块：Title-L「血常规 + 肝功能 + CRP」；其下 Body 次文字色「张\*\*　男 41 岁　10:42 出具」（全角空格分隔）。
- 芯片行（`gap: 8px`，可换行）：高 28、横向 padding 12、圆角 14、填充 `.14`、文字 13/500 次文字色；格式为「缩写」+ 4px 间隔 + 粗体数值与箭头：`WBC 11.2 ↑`（红）、`HGB 128 ↓`（蓝）、`CRP 18.4 ↑`（红）。
- 按钮行（`gap: 12px`）：「阅读报告」主按钮（蓝）、「稍后」次按钮。
- 胶囊按钮：高 32、横向 padding 16、圆角 16、13/600、白字；hover 填充提亮；`:active` 为 `scale(.94)`，过渡 `.2s E`；`:focus-visible` 为 2px `rgba(255,255,255,.8)` 外环、间隔 2px。

### 6.4 read（R × H）

结构（纵向 flex，占满层高）：头部 / 滚动区 / 底栏；水印与隐私遮罩叠在最上层；焚毁用的「余烬」是兄弟节点（见 §7）。

**头部**（`padding: 18px 20px 12px`，`gap: 12px`，横向 flex）

- 左：Title-L「血常规 + 肝功能 + CRP」；Caption「张\*\*　男 41 岁　静脉血　10:42 出具」；Caption 绿色「仅本人可见　不落盘　已加水印」。
- 右：倒计时环 36×36。

**倒计时环**

- SVG viewBox 36，两个圆 `cx=18 cy=18 r=15`，描边宽 3，圆头；整体旋转 −90°（从顶部起，顺时针消耗）。
- 底环 `rgba(255,255,255,.16)`；前景环白色，`stroke-dasharray: 94.2`（≈ 2π×15），`stroke-dashoffset = 94.2 × (1 − T/60)`；`transition: stroke-dashoffset .1s linear, stroke .3s`。
- T ≤ 10 时前景环变橙 `#FF9F0A`。
- 圆心数字：`ceil(T)`，11/600，居中。

**滚动区**

- `padding: 0 16px 12px`，纵向 flex，`gap: 8px`，隐藏滚动条；`transition: filter .5s E`。
- 分节标题：12/16 600 次文字色，`padding: 8px 4px 0`；文案「异常 N 项」「其余 N 项正常」。
- 检验项卡片：背景 `#1C1C1E`，圆角 16，`padding: 12px 14px`，两列网格 `1fr auto`：
  - 左上：项目名 14/20 600 + 缩写（11/500 次文字色，左间距 6）。
  - 左下：「参考 lo–hi」11/16 次文字色。
  - 右（跨两行，垂直居中，右对齐）：数值 18/22 600，字距 −.3px；单位 11/500 次文字色（左间距 3）；异常时箭头（↑ 红 / ↓ 蓝，左间距 4）。
  - 底部（跨两列）：参考范围条。

**参考范围条**（`margin-top: 10px`）

- 轨道：高 4，圆角 2，`rgba(255,255,255,.12)`。
- 正常区间 `.zone`：绝对定位，`top:0; bottom:0`，圆角 2，`rgba(255,255,255,.26)`；`left = p(lo)%`，`width = (p(hi) − p(lo))%`。
- 圆点：10×10 圆，`box-shadow: 0 0 0 3px #1C1C1E`（与卡片底色形成缺口）；颜色：正常白、偏高红、偏低蓝；`left = p(v)%`，水平垂直居中（`top: 50%; margin: -5px 0 0 -5px`）。
- 坐标换算（务必按此实现）：

```
s  = hi - lo
mn = lo > 0 ? lo - 0.6*s : 0
mx = hi + 0.6*s
p(x) = clamp(2, 98, (x - mn) / (mx - mn) * 100)
```

**底栏**

- `padding: 14px 16px 16px`，两端对齐；背景 `linear-gradient(transparent, #000 35%)`（让滚动内容渐隐于底部）。
- 左：「完整报告」次按钮，带 15 的右上箭头图标；右：「阅后即焚」红色按钮（填充 `rgba(255,69,58,.18)`，文字 `#ff6a60`），带 15 的火焰图标。

**水印**

- 铺满阅读层，`pointer-events: none`；平铺块 170×110；块内文字「张\*\* 10:42 仅限本人阅读」，12px，白色 `fill-opacity .07`，绕 (85, 55) 旋转 −24°，基线起点 (8, 64)。

**隐私遮罩**

- 滚动区 `filter: blur(12px)`（过渡 .5s E），同时遮罩层 `opacity 0 → 1`（.4s E，并启用点击）。
- 遮罩内容：居中的胶囊（高 36，横向 padding 16，圆角 18，填充 `.14`，13/600），含 22 的闭眼图标与文字「已隐藏，轻触查看」。

### 6.5 done（210 × 36）

- 居中，`gap: 8px`，13/600：22 的对勾图标 + 文字「已焚毁，未留存」。
- 对勾绿色 `#30D158`，路径描边动画：`stroke-dasharray: 24`，`stroke-dashoffset: 24 → 0`，`.45s E`，延迟 `.2s`（层开启时触发）。

### 6.6 图标路径（viewBox 0 0 24 24，描边 1.75，圆头）

| 图标 | path d |
| --- | --- |
| 烧杯（alert 用完整版） | `M9 3h6M10 3v6.2L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 9.2V3M7.5 15h9` |
| 烧杯（sum 小图标，无液面线） | `M9 3h6M10 3v6.2L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 9.2V3` |
| 右箭头 | `M9 6l6 6-6 6` |
| 右上箭头 | `M7 17L17 7M8 7h9v9` |
| 火焰 | `M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.2.8 2 1.6 2.4C10.2 8.2 10.8 5.4 12 3Z` |
| 对勾 | `M5 12.5l4.5 4.5L19 7.5` |
| 闭眼 | `M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 8.5 4 9.5 6a12 12 0 0 1-2.6 3.3M6.5 7.6A12 12 0 0 0 2.5 12c1 2 4.5 6 9.5 6 1.2 0 2.3-.2 3.3-.6` |

## 7. 阅后即焚（Burn）特效

### 7.1 视觉

阅读内容**从底部向上烧蚀**，烧蚀前沿带橙红色余烬；烧尽后形体弹性收缩为 done 胶囊。

### 7.2 演示版实现（CSS）

- 注册自定义属性：`@property --b { syntax: '<percentage>'; inherits: true; initial-value: -12% }`。
- 阅读内容根节点 `.rd` 加遮罩：

```
mask-image: linear-gradient(to top, transparent calc(var(--b) - 12%), #000 var(--b));
```

--b 为 −12% 时全部可见；增大时，底部越来越多的区域变透明。

- 动画：`@keyframes burn { from { --b: -12% } to { --b: 124% } }`，时长 **1.1 s**，缓动 `cubic-bezier(.55,.05,.75,.4)`（先慢后快），`forwards`。动画加在阅读层 `.v` 上，`.rd` 与余烬都通过继承读取 --b。
- 余烬 `.ember`（与 `.rd` 同级，**不被遮罩**）：`position:absolute; left:0; right:0; height:40px; bottom: calc(var(--b) - 7%)`；背景 `linear-gradient(to top, transparent, rgba(255,159,10,.9) 45%, rgba(255,69,58,.55) 62%, transparent)`；`filter: blur(5px)`；平时 `opacity 0`，焚毁中 `opacity 1`。
- 结束：1100 ms 后清空阅读层内容，状态进入 done。
- 减弱动效：跳过烧蚀，50 ms 后直接进入 done。

### 7.3 非 CSS 实现的等价做法

令烧蚀进度 `b(t)` 从 −0.12 到 1.24，缓动曲线同上。令 y 为自底向上的归一化高度（底边 0，顶边 1）。每帧：

1. 内容透明度遮罩：`alpha(y) = clamp((y − (b − 0.12)) / 0.12, 0, 1)`。
2. 余烬条：高 40 DIP，底边位于 `y = b − 0.07`（相对层高），向上延伸；渐变与模糊同上（高斯标准差 5）。
3. Win2D / Composition：用 CompositionMaskBrush + 线性渐变画刷做遮罩；余烬用带 GaussianBlur 的 SpriteVisual。

### 7.4 真实销毁（演示未包含，真机必须做）

- 焚毁时清空视图状态与 DOM，覆盖并释放数据对象；不写日志、不落盘、不进剪贴板。
- 阅读期间对窗口启用截屏保护：`SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`（Windows 10 2004+；不支持时降级为 `WDA_MONITOR`），焚毁后恢复 `WDA_NONE`。水印只用于防「手机拍屏」。
- WebView2 使用临时用户数据目录或 InPrivate，进程退出即清除。

## 8. 倒计时与隐私策略

### 8.1 倒计时

- T 初值 60 s；定时器每 100 ms 触发；每次若未处于「鼠标悬停暂停」则 `T -= 0.1`；随后更新环与数字；`T <= 0` 触发焚毁。
- 暂停：仅当鼠标进入阅读层（`pointerenter` 且 `pointerType == mouse`）；离开即恢复。**触屏不暂停**。
- T ≤ 10 时环变橙。

### 8.2 闲置遮罩

- 阅读层内 8 s 没有 `pointerdown / pointermove / wheel / touchmove / keydown` → 加类 `priv`（模糊 + 遮罩）。
- `priv` 期间，只有 `pointerdown`（点按）能取消遮罩并重新计时；`pointermove` 等不能取消。
- 窗口失焦（`blur`）且处于 read → 立即 `priv`。
- 每次进入 read 先清除 `priv` 并开始 8 s 计时；焚毁与离开 read 时清除计时。
- 遮罩期间倒计时**继续走**。

### 8.3 其他计时与输入

- alert 停留 7 s 自动 → idle；鼠标进入岛则取消计时，离开后重新计时 2.5 s；仅在 alert 状态生效。
- sum 无自动超时；岛外 `pointerdown` → idle。
- Esc：read → 焚毁；sum / alert → idle。
- resize：重新计算尺寸与停靠模式，并对当前状态再次 go（burn 状态除外）。
- 启动：页面加载 900 ms 后自动播放 alert；「重播」：先 go(idle)，520 ms 后 go(alert)（burn 期间忽略）。

## 9. 示例检验数据（Fixture）

### 9.1 夹具（JS 字面量）

```
const PATIENT = { maskedName: '张**', sex: '男', age: 41, specimen: '静脉血',
                  reportedAt: '10:42', source: '检验科 LIS', title: '血常规 + 肝功能 + CRP' };
// [项目名, 缩写, 结果, 下限, 上限, 单位]
const ITEMS = [
  ['白细胞',     'WBC',  11.2, 3.5, 9.5,  '×10⁹/L'],
  ['血红蛋白',   'HGB',  128,  130, 175,  'g/L'],
  ['C 反应蛋白', 'CRP',  18.4, 0,   6,    'mg/L'],
  ['红细胞',     'RBC',  4.6,  4.3, 5.8,  '×10¹²/L'],
  ['血小板',     'PLT',  235,  125, 350,  '×10⁹/L'],
  ['谷丙转氨酶', 'ALT',  32,   9,   50,   'U/L'],
  ['谷草转氨酶', 'AST',  28,   15,  40,   'U/L'],
  ['总胆红素',   'TBIL', 14.2, 3.4, 20.5, 'μmol/L']
];
const isAbnormal = d => d[2] > d[4] || d[2] < d[3];
```

以上均为虚构的演示数据，不对应任何真实患者。

### 9.2 判定与展示顺序

- 异常 3 项：WBC ↑（红）、HGB ↓（蓝）、CRP ↑（红）；正常 5 项。
- 展示顺序：异常项按原序在前，正常项按原序在后；摘要芯片 = 前 3 个异常项，格式「缩写 数值 箭头」。

### 9.3 预期坐标（单元测试用，容差 ±0.01）

| 项目 | p(lo) | p(hi) | p(v) | 状态 |
| --- | --- | --- | --- | --- |
| WBC | 27.27 | 72.73 | 85.61 | 偏高 |
| HGB | 27.27 | 72.73 | 25.25 | 偏低 |
| CRP | 2（lo=0 时原值 0，被钳制到 2） | 62.50 | 98（原值 191.67，被钳制） | 偏高 |
| RBC | 27.27 | 72.73 | 36.36 | 正常 |
| PLT | 27.27 | 72.73 | 49.49 | 正常 |
| ALT | 27.27 | 72.73 | 52.77 | 正常 |
| AST | 27.27 | 72.73 | 50.91 | 正常 |
| TBIL | 27.27 | 72.73 | 55.98 | 正常 |

补充：CRP 的 zone 为 left 2%、width 60.5%；其余各项 zone 为 left 27.27%、width 45.46%。

### 9.4 真实数据接入契约

```
interface LabItem {
  name: string; abbr: string; unit: string;
  value: number | null; lo: number | null; hi: number | null;
  text?: string;               // 定性结果，如 阴性 / 阳性
}
interface LabReport {
  id: string; title: string; source: string;
  maskedName: string; sex: string; age: number; specimen: string; reportedAt: string;
  items: LabItem[];
}
```

规则（★ 表示演示未覆盖，真机需补）：

- 姓名由主应用脱敏：保留首字，其余替换为 `**`；不展示病历号、身份证号、床号。
- 异常判定：value > hi → 偏高；value < lo → 偏低；仅有单侧边界时做单侧判定。
- ★ 定性项（带 text）：不画范围条，右侧显示文本；阳性按异常处理（红）。
- ★ 范围条退化：lo == hi 或任一边界缺失时不画条，只显示数值与「参考」文字。
- ★ 摘要芯片最多 3 个（按偏离程度 |value − 最近边界| / (hi − lo) 降序）；超过 3 个异常时追加「+N」芯片（次文字色）。
- ★ 异常数为 0：alert 副标题的「N 项异常」改为「全部正常」（次文字色）；sum 不显示芯片，只保留「阅读报告」。
- 条目超过 8 项时阅读区滚动；错峰序号 i 最大取 11，其后的行 i 固定为 11（不再继续延迟）。

## 10. 文案清单

| key | 文案 |
| --- | --- |
| alert.title | 检验报告已出 |
| alert.sub | 血常规 肝功能 CRP + 全角空格 + {N} 项异常 |
| sum.dept / sum.time | 检验科 LIS / 刚刚 |
| sum.title | 血常规 + 肝功能 + CRP |
| sum.meta | 张\*\*　男 41 岁　10:42 出具（全角空格分隔） |
| btn.read / btn.later | 阅读报告 / 稍后 |
| read.meta1 | 张\*\*　男 41 岁　静脉血　10:42 出具 |
| read.meta2（绿色） | 仅本人可见　不落盘　已加水印 |
| sec.abn / sec.ok | 异常 {N} 项 / 其余 {N} 项正常 |
| row.ref | 参考 {lo}–{hi}（中间为 en dash） |
| btn.pc / btn.burn | 完整报告 / 阅后即焚 |
| priv.hint | 已隐藏，轻触查看 |
| watermark | 张\*\* 10:42 仅限本人阅读 |
| done | 已焚毁，未留存 |
| toast.pc（仅演示） | 演示：只有走到这一步，才会升级为独立的 PC 窗口（真机替换为实际打开完整报告窗口） |
| replay（仅演示控件） | 重播：收到检验报告 |

文案规则：句末不加标点（上表中已有的逗号除外）；元信息用全角空格分隔，不用圆点；不用 emoji，不用感叹号。

## 11. 真机集成（Windows）

### 11.1 窗口与系统行为

| 项 | 规范 |
| --- | --- |
| 窗口类型 | 无边框、透明、置顶、跳过任务栏、不抢焦点（WS\_EX\_TOPMOST / TOOLWINDOW / NOACTIVATE / LAYERED） |
| 窗口尺寸策略 | 使用一个固定的大透明窗口，**不逐帧改窗口尺寸**；尺寸约 (400 + 2×48) × 660 DIP（宽度含两侧各 48 的阴影边距；高度含最大 H 580、Float 的 8 偏移、底部阴影 48 与余量），顶边贴显示器顶、水平居中；所有动画只发生在窗口内部 |
| 命中测试 | 窗口大部分透明，必须只让岛的形状接收鼠标。Tauri：Rust 侧 60 Hz 轮询 GetCursorPos，与形体矩形比较（前端每帧经 IPC 上报 w、h 和停靠模式；idle 时降到 15 Hz），动态切换 set\_ignore\_cursor\_events。原生：WM\_NCHITTEST 在形体外返回 HTTRANSPARENT |
| 焦点与 Esc | 默认不激活窗口。sum / read 状态期间注册全局快捷键 Esc，离开后注销；不要为了接收 Esc 而移除 NOACTIVATE（会抢走用户正在输入的窗口的焦点） |
| DPI | Per-Monitor V2；位置与尺寸吸附到物理像素 |
| 多屏 | 默认主屏；可选跟随活动窗口所在屏；显示器、缩放、分辨率变化后 200 ms 内重算位置 |
| 全屏 / 演示 | SHQueryUserNotificationState 为忙碌 / D3D 全屏 / 演示模式时，alert 不展示并入队，退出后补发 |
| 顶部任务栏（Win10） | 自动切 Float，并下移到工作区顶边 |
| 事件冲突 | 处于 read 时新事件**不打断**，排队，待回到 idle 后展示（★ 与通用规范的 P0 打断规则不同，检验报告场景刻意如此） |
| 性能目标 ★ | idle 时 CPU < 0.5%；动画 60 fps（120 Hz 屏为 120 fps）；弹簧静止后停止渲染循环 |
| 渲染限制 | 岛体不用模糊 / 亚克力；透明窗口里文字为灰度抗锯齿 |

### 11.2 推荐技术路径

| 路径 | 要点 |
| --- | --- |
| Tauri 2 + WebView2 | 移植最快，HTML / CSS / JS 基本原样复用；窗口配置 decorations: false、transparent: true、alwaysOnTop: true、skipTaskbar: true、focus: false、shadow: false、resizable: false；注意 WebView 的内存占用，并使用临时数据目录 |
| 原生 Win32 + Composition / Win2D | 性能最好，弹簧与遮罩最容易做到 120 fps；映射见 §13 |
| WPF | 透明窗口 + 自绘 Path 可行；弹簧需自行积分；留意软件渲染回退 |

## 12. 参考代码（关键算法）

### 12.1 尺寸与状态切换

```
const sizes = () => {
  const W = Math.min(372, innerWidth - 24), R = Math.min(400, innerWidth - 16);
  const H = Math.max(380, Math.min(580, innerHeight - 100));
  return { idle: [124, 32, 16, 0], alert: [W, 88, 36, 1], sum: [W, 200, 40, 1],
           read: [R, H, 44, 1], done: [210, 36, 18, 0] };   // [宽, 高, 圆角, 是否 big 阴影]
};

function go(s) {
  state = s;  isFloat = innerWidth < 640;
  const Z = sizes(), z = Z[s];
  for (const k in layers) {                       // 每个层固定为自己的目标尺寸
    layers[k].setVar('--vw', Z[k][0] + 'px');
    layers[k].setVar('--vh', Z[k][1] + 'px');
    layers[k].toggle('on', k === s);
  }
  island.toggle('big', !!z[3]);
  island.toggle('pk', s === 'idle' || s === 'alert');
  K = s === 'idle' ? [260, 28] : s === 'done' ? [320, 26] : [190, 22];   // 宽度、圆角
  target = { w: z[0], h: z[1], r: z[2] };                                   // 高度恒用 [210, 23]
  clearTimeout(alertTimer);
  if (s === 'alert') alertTimer = setTimeout(() => go('idle'), 7000);
  if (s !== 'read') { clearInterval(countdown); clearTimeout(privTimer); }
  startLoopIfNeeded();
}
```

### 12.2 检验项行的错峰序号

```
let i = 1;
header.i = 0;
sectionAbn.i = i++;                          // 1，之后 i = 2
for (const d of abnormal) row(d).i = ++i;    // 3, 4, 5, ...
sectionOk.i = ++i;                           // 6
for (const d of normal) row(d).i = ++i;      // 7, 8, 9, ...
// 真机补充规则：实际使用 min(i, 11)
```

### 12.3 倒计时与焚毁

```
function openRead() {
  renderReader(); T = 60; go('read');
  countdown = setInterval(tick, 100);
  resetPrivTimer();                    // 8 s 后加 priv
}
function tick() {
  if (state !== 'read') return;
  if (!mouseHovering) T -= 0.1;
  ringFg.dashoffset = 94.2 * (1 - T / 60);
  ring.toggle('warn', T <= 10);
  ringLabel = Math.max(0, Math.ceil(T));
  if (T <= 0) burn();
}
function burn() {
  if (state !== 'read') return;
  state = 'burn';
  clearInterval(countdown); clearTimeout(privTimer);
  readLayer.removeClass('priv'); readLayer.addClass('burning');       // 1.1 s 烧蚀动画
  setTimeout(() => {
    readLayer.removeClass('burning'); readLayer.clear();
    go('done');
    setTimeout(() => go('idle'), 1700);
  }, reducedMotion ? 50 : 1100);
}
```

### 12.4 参考范围条

```
function bar(lo, hi, v) {
  const s = hi - lo, mn = lo > 0 ? lo - 0.6 * s : 0, mx = hi + 0.6 * s;
  const p = x => Math.max(2, Math.min(98, (x - mn) / (mx - mn) * 100));
  return { zoneLeft: p(lo), zoneWidth: p(hi) - p(lo), dot: p(v),
           state: v > hi ? 'H' : v < lo ? 'L' : 'N' };
}
```

## 13. 原生渲染映射

| 概念 | HTML 演示 | 原生（Skia / Composition）等价 |
| --- | --- | --- |
| 形体 | div + border-radius | 自绘路径：Notch = 顶角直角 + 底角圆角 r + 两只耳朵（半径 10 的凹圆弧）；Float = 圆角矩形 |
| 耳朵 | radial-gradient 伪元素 | 路径中的两段凹圆弧，见下方路径模板 |
| 圆角平滑 | 普通圆弧 | ★ 升级为 squircle（连续曲率，约 60% 平滑） |
| 内容裁剪 | overflow hidden | 裁剪到形体路径 |
| 层显隐 | opacity / blur / scale 过渡 | Opacity + GaussianBlur（标准差 10 → 0）+ Scale（0.97 → 1）；动画交给合成器线程 |
| 阴影 | box-shadow 两层 | DropShadow：(0, 12) 模糊 32 扩散 −4 α0.45；(0, 2) 模糊 6 α0.30 |
| 遮罩 | CSS mask + @property | CompositionMaskBrush + LinearGradientBrush，逐帧更新进度 b |
| 弹簧 | rAF 数值积分 | 独立渲染循环里积分（§4.2），不要用固定时长动画代替 |
| 模糊 | filter: blur(Npx)，N 为高斯标准差 | Win2D GaussianBlurEffect.BlurAmount = N |

Notch 形体路径模板（主体宽 W、高 H、底角 r，整体宽 Wt = W + 20，耳朵半径 10；每帧用当前弹簧值代入）：

```
M0 0 H(Wt) A10 10 0 0 0 (Wt-10) 10 V(H-r) A(r) (r) 0 0 1 (Wt-10-r) (H)
H(10+r) A(r) (r) 0 0 1 10 (H-r) V10 A10 10 0 0 0 0 0 Z
```

## 14. 验收与测试

### 14.1 量化验收

| ID | 检查 | 期望 |
| --- | --- | --- |
| A1 | 静止尺寸：idle 124×32；alert W×88；sum W×200；read R×H；done 210×36 | 误差 ≤ 0.5 DIP |
| A2 | idle → alert 录制宽度曲线 | 峰值约 372 + 4（±2）；2% 稳定时间约 0.36 s（±0.08） |
| A3 | 内容晚到早走：记录层 opacity | 旧层 120 ms 内降到 0；新层在 90 ms 之后才开始上升 |
| A4 | 中途反向：alert → sum 进行到 100 ms 时触发 idle | 宽、高曲线连续，相邻帧位置差 ≤ 当前速度 × dt + 1 DIP |
| A5 | 排版稳定：形变期间内容元素相对形体顶边中心的位置 | 偏移 ≤ 0.5 DIP |
| A6 | 范围条：用 §9.1 夹具计算 | 与 §9.3 一致（±0.01） |
| A7 | 倒计时：60 s 焚毁；鼠标悬停暂停；触屏不暂停；T ≤ 10 环变橙 | 误差 ≤ 0.2 s |
| A8 | 闲置遮罩：8 s 无输入；仅点按取消；失焦立即遮罩 | 符合 §8.2 |
| A9 | 焚毁：烧蚀 1.1 s（±50 ms），随后 done 1.7 s，再回 idle；期间忽略一切输入 | 符合 §7、§8 |
| A10 | 减弱动效：系统关闭动画 | 无弹簧、无模糊、无缩放，状态直接切换；焚毁 50 ms 内完成 |
| A11 | 穿透：点击岛外区域 | 事件到达下层窗口 |
| A12 | 无残留：焚毁后在内存 / DOM / 日志中搜索「张\*\*」和全部项目名 | 无命中 |
| A13 | 停靠模式：vw ≥ 640 为 Notch（有耳朵、顶角直角）；vw < 640 为 Float（偏移 8、四角圆角） | 一致 |

### 14.2 手动演练脚本

1. 启动 900 ms 后自动出现 alert；悬停可 Peek，且 7 s 内不收起。
2. 点击 alert → sum；点岛外 → idle。
3. 重播 → alert → sum → 阅读报告：观察三层同体变形，范围条圆点依次滑入。
4. 阅读中静置 8 s → 遮罩；点按恢复；仅移动鼠标不应恢复。
5. 阅读中鼠标悬停 → 倒计时暂停；移开后恢复。
6. 点「阅后即焚」（或等待 60 s / 按 Esc）→ 从下向上烧蚀 → 对勾 → 收回胶囊。
7. 烧蚀过程中快速点击、按 Esc、点重播 → 全部被忽略。
8. 窗口宽度缩到 640 以下 → 变为 Float；再放大 → 变回 Notch。
9. 任意展开到一半反向收起 → 无跳变。

## 15. 已知取舍与待办（★）

- 圆角：演示为普通圆弧，通用规范要求连续曲率（squircle，约 60% 平滑）；真机升级后需重做 §13 的路径与 2% 稳定时间测试。
- hairline：演示在暗色环境恒显，真机按壁纸亮度自适应（亮度 < 0.15 才描边）。
- 高度弹簧：演示恒用 k=210、c=23；收起时是否改用 collapse 弹簧，需实机手感决定。
- 键盘与读屏：演示只有 Esc 和按钮原生焦点；真机补 Tab 顺序、Enter / Space 触发，以及 UI Automation LiveRegion（普通事件 Polite）。
- 事件队列、优先级、多事件分裂（S1 + S2）：演示未包含，见《设计规范》§10.4 与 §9.5。
- 声音、触觉：无。
- 定性结果、单侧范围、无异常、异常超过 3 项：见 §9.4 的 ★ 规则。
- 截屏保护、临时数据目录、内存清理（§7.4）：演示未包含，真机必须实现。
- 待校准清单：§3.1 尺寸、§4.1 全部弹簧、§5 全部时长与延迟、§7 烧蚀时长与曲线、§8 的 60 s / 8 s / 7 s / 2.5 s。
