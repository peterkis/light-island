> **历史规范说明（2026-10-06）：** 当前临床界面已按用户新增的 `Windows 灵动岛 UI UX 设计规范 v1.0.md` 实现。本文保留上一轮设计记录，不再作为当前视觉 token 生成源。差异解释见 `UIUX-V1-IMPLEMENTATION.md`。

# Windows 桌面灵动岛 UI 设计与交互规范

版本：1.1（2026-10-04：恢复已选定的 U 型与连续动效）
研究日期：2026 年 10 月 1 日  
适用实现：Rust 原生窗口层、Tauri 2、React 内容层、GSAP 动效层  
交付对象：产品设计者、前端与 Rust Coding Agent、无障碍与测试工程师  
规范性质：产品约束与工程契约；具体 PASS / FAIL / NOT_RUN 以本轮 evidence/clinical-motion-20261004/ 为准，不将目标值写成实测。

## 0 如何使用本规范

本规范定义一款 Windows 桌面顶部常驻状态组件。核心方案是**贴顶、下垂展开的桌面刘海**：静默时保持小而安静，存在活动时呈现简明状态，用户主动操作后展开必要的控制。它借鉴 Apple Live Activities 的渐进披露原则，但尺寸、窗口行为、曲线和优先级均为本产品的桌面设计决策。

实现 Agent 应先阅读第 1、3、4、8、10、11 章，再按第 15 章顺序实现。不得只提取颜色与动画参数而忽略布局预算、原生命中测试和无障碍要求。

### 0.1 规范强度

- **MUST**：发布前必须满足；不满足就记录为阻断项，不得宣称合规
- **SHOULD**：默认采用；偏离时记录理由、影响及验证结果
- **MAY**：可选增强，不得损害 MUST 项
- **MUST NOT**：禁止的实现方式或对外表述

### 0.2 证据标签

| 标签 | 含义 | 如何使用 |
| --- | --- | --- |
| `[APPLE-HIG]` | Apple 官方人机交互设计建议 | 仅说明 Apple 场景中的指导，不自动成为 Windows 的系统规范 |
| `[APPLE-API]` | Apple 官方 API、框架行为或开发者讲解 | 说明特定 API 的能力及边界，不能推导未公开内部实现 |
| `[WINDOWS-SPEC]` | Microsoft、Tauri、GSAP、W3C 等官方技术资料 | 每项同时写明实际平台或标准；此标签是工程证据分类，不表示这些资料都由 Microsoft 发布 |
| `[PROPOSED]` | 本项目明确提出的桌面设计、算法、预算或验收目标 | 是可修改、可测量的产品决策，不称作 Apple 官方数值 |
| `[VERIFY]` | 必须在目标实现、版本或设备上验证的条件 | 必须有测试记录才能去掉待验证状态 |

正文中的源编号对应第 17 章来源登记表。外部官方事实与本项目决策分开描述。某个段落标为 `[PROPOSED]`，不意味着紧邻的 API 已经在本项目验证。

### 0.3 冲突处理和唯一事实源

优先级为：安全与隐私约束 → 无障碍和输入可达性 → 经验证的平台能力 → 状态机及布局规则 → 数值 token →装饰效果。不得为了某个固定高度而裁掉可操作内容。

第 4 章的 JSON 是**唯一数值 token 源**。其余章节的相同数字是示例或说明；实现时从 JSON 生成 CSS/TypeScript/Rust 常量，不再手写第二份配置。官方 API 示例、数学推导和测试输入不属于设计 token。改变 JSON 后，必须同步更新示例、快照和验收预期。

## 1 产品边界与 Apple 参照关系

### 1.1 三种形态不能混为一谈

| 对象 | 控制者与物理条件 | 本项目如何借鉴 |
| --- | --- | --- |
| iPhone Dynamic Island | iOS 管理的系统呈现区域，与特定设备硬件区域和 Live Activities 机制相关；应用提供指定呈现内容 | 借鉴少量、即时、易扫读的信息，以及紧凑与展开的连续关系 |
| Mac 摄像头刘海 | 显示屏硬件与顶部系统区域的真实结构 | 仅借鉴贴顶轮廓的视觉意象，不声称 Mac 的硬件刘海本身是 Dynamic Island |
| 本项目 Windows 桌面刘海 | 应用拥有的透明或自绘桌面窗口，无 iOS 系统级托管区域 | 自行负责窗口、命中测试、焦点、多显示器、隐私、遮挡和退出入口 |

[APPLE-HIG][APPLE-API] Apple 的 compact、minimal、expanded 是 Live Activities 的特定呈现语义；expanded 提供 leading、trailing、center、bottom 区域。它们不是“任意桌面卡片必须遵循四等分栅格”的规定。[A1][A2]

[PROPOSED] 本项目采用 `idle / compact / expanded` 三种稳定视觉状态。这里的 `idle` 不是 Apple 官方的 Live Activity 展示状态；同时存在多项活动时，也不照搬 iOS 的 minimal 小圆岛。采用一个主岛和明确的活动切换入口，避免桌面顶端不断增殖的浮动控件。

### 1.2 应继承的设计原则

1. **状态优先**：折叠界面回答“正在发生什么”和“是否需要我处理”，不承担完整消息中心或播放器首页
2. **稳定身份**：同一活动从小到大保持图标、主色和关键数字的对应关系
3. **渐进披露**：展开后才提供上下文与操作；与任务无关的功能留给主应用
4. **内容新鲜度**：过期、失败、完成都必须是明确状态，不能让停止更新的数字冒充实时数据
5. **可选择的打扰**：默认不抢焦点，不因每次数字更新弹开，不以持续动画争夺注意力
6. **可恢复的交互**：关闭卡片、隐藏活动、结束任务、退出应用必须分开表达

[APPLE-HIG] Apple 对 Live Activities 的核心建议包括聚焦当前活动、保持可扫读、避免把它当广告入口，并提供适合各呈现的内容。[A1] 上述六条是这些方向在 Windows 产品中的具体化 `[PROPOSED]`，不是 Apple 原文清单。

### 1.3 官方尺寸应如何阅读

[APPLE-HIG] 当前 HIG 的 iOS 尺寸表以 pt 给出以下设计参考；首表中的 compact 数字是**单侧内容区**，不是整岛宽度。[A1]

| HIG 屏幕参考尺寸 | Compact leading | Compact trailing | Minimal | Expanded |
| --- | --- | --- | --- | --- |
| 393 × 852 pt | 52.33 × 36.67 pt | 52.33 × 36.67 pt | 36.67–45 × 36.67 pt | 371 × 84–160 pt |
| 430 × 932 pt | 62.33 × 36.67 pt | 62.33 × 36.67 pt | 36.67–45 × 36.67 pt | 408 × 84–160 pt |

HIG 另表列出 compact/minimal 的整岛宽度 230 或 250 pt。不能把单侧宽加到本项目 280 DIP 上，也不能把两个表当作同一测量对象。该页还列有 44 pt 圆角参考，但句子未逐状态限定；不得擅自改写成“仅 expanded 使用 44”，也不得机械套入每个 Windows 状态。HIG 的 14 pt 内边距建议指锁屏 Live Activity，不是所有岛体状态通用 padding。[A1]

上述数据用于建立来源边界，**不进入第 4 章 Windows token**。本产品没有真实摄像头占位，因此不保留没有功能的中央空洞。

### 1.4 本规范不作的承诺

- MUST NOT 将桌面宽高、圆角、7 DIP 内侧耳角、特定黑色、450 ms 或某组弹簧参数称为 Apple 官方 Dynamic Island 精确规范
- MUST NOT 宣称 GSAP `elastic.out(1, 0.75)` 等价于 SwiftUI `response: 0.44, dampingFraction: 0.74`
- MUST NOT 声称本规范已经解决当前代码中的窗口抖动；未列入本轮 evidence 的硬件组合不得据此冒称已验证
- MUST NOT 把“看起来透明”当成“鼠标能穿透”，把“有 ARIA”当成“Windows 读屏已经可用”
- MUST NOT 把“始终置顶”解释为可覆盖安全桌面、UAC、锁屏或任意独占全屏

## 2 用户参考稿的采用与修正

参考稿见 [U1]。它是视觉与产品输入，不是官方证据。以下修正保留其贴顶黑色刘海方向，但消除实现时的歧义。

| 参考稿选择 | 判断 | 本规范处理 |
| --- | --- | --- |
| 180 × 34 待机、280 × 36 紧凑 | 桌面提案，非 Apple 尺寸；36 高搭配 24 高内容仅允许上下各 6 | 待机恢复 160 × 34；紧凑基线改为 280 × 40，上下各 8；随文字缩放增高 |
| 展开 380–420 × 110–140 | 富内容和操作区预算偏紧 | 默认宽 400；简卡基线 160、媒体等复杂卡 192，真实高度由内容计算 |
| 所有子元素必须同心圆角 | 范围过宽，图标、头像、按钮并非等距内嵌轮廓 | 仅等距嵌套容器参考内外圆角关系；头像、图标、胶囊各有独立形状语义 |
| 38 × 38、圆角 10 等同 Squircle | 普通圆角矩形不等于连续曲率超椭圆 | 使用明确的 rounded rectangle；若将来采用连续曲率，需要独立路径和可测算法 |
| 纯黑再加 blur 24 | 不透明黑层遮住后方采样；CSS blur 也不自动采到桌面 | V1 用不透明黑、不启用模糊；原生材质另设验证分支 |
| 白色 40% 时间戳 | 在黑底约为 #666666，正常小文字对比不足 | 语义文本使用显式 #B0B0B0 或更亮；不把装饰灰用于时间或状态 |
| 右区 36–48 同时放时间和关闭 | 无法稳定容纳 `2m ago`、间距及可点击目标 | 右区只固定关闭目标；时间进入中区元数据行，或用独立测量列 |
| 11 px caption | 桌面高密度、缩放及中英文混排下可读性弱 | 最小语义文字基线 12，默认正文 14；不得缩小文字来救布局 |
| “所有字重 Medium 以上” | HIG 确实建议 Medium 或以上；稿内 Regular caption 与此方向不一致 | 保留 Medium+ 方向；正文与辅助文字 500、标题 600，并验证实际字体可用字重、对比度和留白 |
| 0.74 为超阻尼且轻微弹跳 | 0.74 是欠阻尼；理想超阻尼没有振荡回弹 | 默认恢复旧版有限欠阻尼宽度曲线（ζ=0.84）；高度单调，另保留关闭的物理积分实验，不宣称 Apple 精确复刻 |
| 展开 450，内容延后 50；收起 320 | 可作为桌面节奏起点，非官方时间线 | 由 1.1 的展开 540ms、收回 340ms 外壳时序替代；内容只淡入与轻微水平位移，文字缩放恒为 1 |

[WINDOWS-SPEC] 普通文本的 WCAG 对比度基线为 4.5:1；#666666 对 #000000 约 3.66:1，不满足该基线。[W1] 对本项目而言这是直接影响可读性的设计修正。全部候选状态色、按钮色和材质最终仍须逐对计算与实测。

## 3 几何模型与坐标契约

### 3.1 单位

[PROPOSED] 设计长度用 **DIP** 表达；在 WebView 页面缩放为 100% 的基线条件下，以逻辑 CSS px 实现。它们不是屏幕物理像素，也不是 Apple 的 pt 参数。原生与 WebView 的换算必须经校准：系统 DPI、浏览器页面缩放和文字缩放是三个独立输入，禁止重复乘倍率。

- `d = effectiveDpi / 96`：原生逻辑坐标到物理坐标的候选比例 `[WINDOWS-SPEC][VERIFY]`
- `textScale`：系统文字倍率，影响字号、行高和重新排版；不自动放大所有图标与窗口边框
- `webZoom`：WebView 页面倍率；产品默认维持 1，若提供缩放入口须加入坐标换算与测试
- `devicePixelRatio`：Web 渲染观测值；不能未经验证就替代所有原生 DPI 信息

对**目标显示器局部**逻辑矩形 `(x,y,w,h)`，设该显示器的物理屏幕原点为 `(Ox,Oy)`，物理包围边界使用：

```text
left   = Ox + floor(x*d)
top    = Oy + floor(y*d)
right  = Ox + ceil((x+w)*d)
bottom = Oy + ceil((y+h)*d)
```

这是本项目保证包围完整性的栅格化策略 `[PROPOSED]`。`Ox/Oy` 已是 physical screen 坐标，不能再乘 d。不同 DPI 显示器不存在一个可以覆盖全虚拟桌面的统一 `screenX*d` 变换。不要分别四舍五入位置和宽度，否则会积累边界差。

所有接口字段 MUST 标注坐标域：`screenPhysical`、`monitorLocalDip`、`windowClientPhysical`、`bodyDip` 或 `cssPx`。耳角、阴影包围和 window/client 原点偏移必须显式加减。接到 Tauri 的 PhysicalSize/Position 后不能因前端也有 devicePixelRatio 又乘一次。[T1]

### 3.2 顶部锚点

正常桌面模式将主岛中心对齐目标显示器顶部的**可用锚点区间**。不是把虚拟桌面全宽的中心当成显示器中心。

1. 优先使用用户选定的显示器；初次使用主显示器
2. 从显示器边界、工作区、任务栏或其他保留区域得出 `anchorRect`
3. 无顶部保留区域时 `anchorY = monitorTop`；若顶部有系统任务栏，`anchorY = workAreaTop`
4. 岛体贴到 `anchorY`；顶部避让模式在视觉上属于悬挂于工作区，不得覆盖任务栏
5. 显示器移除后回退到现存主显示器；保存偏好而不是保存失效 HWND 或陈旧物理坐标

[PROPOSED] 有摄像头刘海的概念不代表 Windows 屏幕上存在必须绕开的真实摄像头孔。禁止凭 1920×1080 或“2K”硬编码中央硬件保留区。

### 3.3 外轮廓（1.1，替代圆弧外耳版）

恢复此前用户认可的 U 型：上沿贴顶、两侧小型反向过渡、下角由两段三次曲线柔化。宽度 `w` 是包含耳角的视觉总宽，范围为 `[0,w] × [0,h]`，不得再额外加 `2e` 或把 SVG 向左移 `e`。待机基线为 160×34 DIP，耳角参数 7，底角参数 18；文字放大仍按内容增高，不能缩小字来保住 34。

`e=min(ear,w/8,h/4)`，`r=min(radius,(w-2e)/2,h-e)`。与旧版 `src/lib/geometry.ts` 的 U 形一致，临床实现的 SVG 和原生多边形在同一曲线上采样。它是本产品拟合曲线，不称为精确 Apple Squircle。

```text
M 0,0 L w,0
C w-.55e,0 w-e,.45e w-e,e
L w-e,h-r
C w-e,h-.55r w-e,h-.35r w-e-.175r,h-.175r
C w-e-.35r,h w-e-.55r,h w-e-r,h
L e+r,h
C e+.55r,h e+.35r,h e+.175r,h-.175r
C e,h-.35r e,h-.55r e,h-r
L e,e C e,.45e .55e,0 0,0 Z
```

每段曲线采样形成原生轮廓；内容单独按同一外壳裁切，不以普通 border-radius 代替外形，也不裁掉外壳抗锯齿。临床富内容继续采用 400 DIP 基线宽度与可滚动详情，不回退为旧横向单行内容。

### 3.4 单一形状与三个不同区域

MUST 区分：

1. `visualShape`：不透明外壳的实际区域
2. `nativeInputShape`：原生窗口应接收输入的区域；无障碍目标可以在可见外壳内部扩大，不能形成大块不可见的桌面遮罩
3. `effectBounds`：阴影等装饰的包围框；该区域不得仅因有阴影而捕获输入

`visualShape` 与 `nativeInputShape` MUST 由同一个 `ShapeModel` 和同一组活动几何值派生。React、CSS、Rust 不得分别猜一套半径。在**稳定态**，视觉抗锯齿与原生离散像素边缘保留 2 个物理像素的抗锯齿余量，允许亚像素取整差；不能出现整个耳角可见却不可点、圆角外大面积透明却可点的情况。动画中的同步由第 10.3 节阶段门单独验证，不能把同一公式误当作两个进程已逐帧同步的证明。

[VERIFY] Windows 透明窗口、WebView2 合成、窗口区域与跨进程鼠标穿透的组合能力必须用真实桌面测试。透明样式、CSS `pointer-events:none`、Tauri 整窗忽略光标、某个 `WM_NCHITTEST` 返回值，都不能单独证明透明区会正确把点击交给背后的其他应用。

### 3.5 内外圆角规则

[APPLE-HIG] Apple 的设计讲解强调内容与容器边缘的协调关系，而不是令所有孩子共享同一圆角。[A5] [PROPOSED] 本规范的精确同心公式仅适用于一个明确圆角容器的**等距内缩轮廓**。若圆弧外半径为 `R`、法线内缩为 `p`，理想圆弧内半径为 `max(0, R-p)`。这不是所有孩子共享 `R-p` 的通用 CSS 公式。

- 头像：圆形，表达人物
- 应用图标或封面：40 × 40 的圆角矩形，半径 10；内容本身已有品牌形状时保留原始比例
- 操作按钮：胶囊或圆角矩形，依其目标大小定义
- 进度条：两端半圆，与其厚度对应
- 焦点环：根据被聚焦控件轮廓偏移，不使用岛体的大圆角

必须使用底部安全内边距，禁止让文字或按钮靠近圆角切掉的下角区域。

## 4 唯一设计 token

下列 JSON 是有效 JSON，不含注释。全部具体 UI 数值均为 `[PROPOSED]`。字段中的 `proposedNotMeasured` 表示预算，不是性能实测。颜色状态名可以稳定使用，数值未来可经过对比度与实机评审修改。

```json
{
  "schemaVersion": "1.1.0",
  "platform": "windows-tauri2-react-gsap",
  "units": {
    "geometry": "dip",
    "time": "ms",
    "fontBase": "cssPxAtTextScale1"
  },
  "geometry": {
    "anchor": "target-monitor-usable-top-center",
    "earRadius": 7,
    "idle": {
      "width": 160,
      "height": 34,
      "bottomRadius": 18
    },
    "compact": {
      "width": 280,
      "minHeight": 40,
      "bottomRadius": 20,
      "paddingX": 12,
      "paddingY": 8
    },
    "expanded": {
      "baseWidth": 400,
      "preferredMaxWidth": 560,
      "widthGrowthPerTextScale": 160,
      "simpleMinHeight": 160,
      "richMinHeight": 192,
      "maxViewportHeightRatio": 0.6,
      "preferredMaxHeight": 480,
      "bottomRadius": 32,
      "paddingX": 20,
      "paddingY": 16
    },
    "viewportMargin": 16,
    "pixelBoundaryTolerance": 2,
    "effectInset": {
      "left": 24,
      "right": 24,
      "bottom": 32,
      "top": 0
    },
    "effectInsetStatus": "candidate-needs-shadow-clipping-test",
    "contour": "legacy-u-cubic-ears-inside-total-width"
  },
  "space": {
    "s0": 0,
    "s1": 4,
    "s2": 8,
    "s3": 12,
    "s4": 16,
    "s5": 20,
    "s6": 24,
    "s7": 32
  },
  "layout": {
    "iconTextGap": 12,
    "textStackGap": 4,
    "sectionGap": 12,
    "controlGap": 8,
    "headerCloseColumn": 32,
    "progressThickness": 4,
    "primaryActionMaxCount": 2,
    "compactTextLines": 1,
    "expandedBodyPreviewLines": 2
  },
  "templates": {
    "compactExample": {
      "indicatorWidth": 64
    },
    "notification": {
      "twoLineWithActionsMinHeight": 168,
      "headerHeight": 40,
      "sectionGap": 12
    },
    "media": {
      "headerHeight": 56,
      "bottomPadding": 24,
      "controlRowHeight": 44
    }
  },
  "type": {
    "fontFamily": "\"Segoe UI Variable Text\", \"Segoe UI\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", sans-serif",
    "numericVariant": "tabular-nums lining-nums",
    "title": {
      "size": 15,
      "lineHeight": 20,
      "weight": 600
    },
    "body": {
      "size": 14,
      "lineHeight": 20,
      "weight": 500
    },
    "compact": {
      "size": 13,
      "lineHeight": 20,
      "weight": 500
    },
    "caption": {
      "size": 12,
      "lineHeight": 16,
      "weight": 500
    },
    "button": {
      "size": 13,
      "lineHeight": 20,
      "weight": 600
    },
    "digit": {
      "size": 26,
      "lineHeight": 32,
      "weight": 600
    }
  },
  "color": {
    "surface": "#000000",
    "surfaceRaised": "#1F1F1F",
    "surfaceHover": "#333333",
    "surfacePressed": "#3D3D3D",
    "textPrimary": "#FFFFFF",
    "textSecondary": "#C2C2C2",
    "textTertiary": "#B0B0B0",
    "decorationMuted": "#666666",
    "rimDecorative": "#333333",
    "focusRing": "#FFFFFF",
    "statusSuccess": "#5CDE7A",
    "statusWarning": "#FFB547",
    "statusInfo": "#66B2FF",
    "statusError": "#FF8A80",
    "progressTrack": "#666666",
    "progressFill": "#FFFFFF"
  },
  "material": {
    "mode": "opaque",
    "backdropBlur": 0,
    "rimWidth": 1,
    "shadow": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "spread": 0,
      "rgba": "rgba(0,0,0,0.40)"
    }
  },
  "icon": {
    "compactGlyph": 18,
    "compactBox": 24,
    "expandedArt": 40,
    "artRadius": 10,
    "controlGlyph": 18,
    "stroke": 1.75
  },
  "control": {
    "minPointerTarget": 32,
    "preferredTouchTarget": 44,
    "buttonMinHeight": 32,
    "buttonPaddingX": 12,
    "focusRingWidth": 2,
    "focusRingInset": 2
  },
  "motion": {
    "hover": {
      "duration": 120,
      "ease": "power1.out"
    },
    "press": {
      "duration": 80,
      "ease": "power1.out"
    },
    "expand": {
      "total": 565,
      "shellDuration": 540,
      "shellEase": "clinical-legacy-spring",
      "contentDelay": 60,
      "contentDuration": 180,
      "contentTranslateY": 0,
      "contentScaleFrom": 1,
      "shellDelay": 25,
      "contentTranslateX": 4,
      "heightEase": "power3.out",
      "spring": {
        "dampingRatio": 0.84,
        "angularFrequency": 13,
        "maxWidthOvershootRatio": 0.01
      }
    },
    "collapse": {
      "total": 410,
      "contentDuration": 55,
      "shellDelay": 70,
      "shellDuration": 340,
      "shellEase": "power3.out"
    },
    "replace": {
      "duration": 160,
      "ease": "power1.out"
    },
    "reduced": {
      "duration": 0,
      "translate": 0,
      "scale": 1,
      "overshoot": 0
    },
    "springExperiment": {
      "enabledByDefault": false,
      "model": "second-order-linear-analytic",
      "mass": 1,
      "dampingRatio": 0.74,
      "periodConventionSeconds": 0.44,
      "angularFrequencyFormula": "2*pi/periodConventionSeconds",
      "stiffnessFormula": "mass*angularFrequency^2",
      "dampingFormula": "2*mass*dampingRatio*angularFrequency",
      "positionToleranceDip": 0.25,
      "speedToleranceDipPerSecond": 2,
      "settledConsecutiveSamples": 3
    },
    "handoff": {
      "exitDuration": 55,
      "finalPaintFrames": 2,
      "occludedFinalizeTimeout": 100,
      "watchdogTimeout": 1500,
      "maxInFlight": 1
    }
  },
  "behavior": {
    "hoverExpands": false,
    "pointerLeaveCollapsesExplicitOpen": false,
    "autoAcquireFocus": false,
    "notificationPreviewTimeout": 6000,
    "completedCompactTimeout": 6000,
    "maxVisiblePrimaryActivities": 1,
    "maxQueuedPreviewCount": 3,
    "maxStoredActivities": 20,
    "aggregateProgressPublishInterval": 250,
    "staleGrace": 5000
  },
  "accessibility": {
    "normalTextMinContrast": 4.5,
    "uiComponentMinContrast": 3,
    "testTextScaleFactors": [
      1,
      2,
      2.25
    ],
    "respectReducedMotion": true,
    "respectForcedColors": true,
    "autoAnnounceEveryTick": false
  },
  "validation": {
    "dpiPercentages": [
      100,
      125,
      150,
      175,
      200
    ],
    "motionFrameBudget60Hz": 16.67,
    "motionFrameBudget120Hz": 8.33,
    "inputFeedbackP95": 100,
    "nativeGeometryMutationsPerNormalTransitionMax": 0,
    "steadyIdlePollingHz": 0,
    "performanceStatus": "requires-current-native-validation",
    "nativeOutlinePolicy": "finite-motion-only-coalesced-previous-next-union"
  }
}
```

### 4.1 Token 实现规则

- 色彩和字阶生成 CSS custom properties；所有字体大小与行高乘同一个有效文字倍率
- `space` 是设计间距集合，不要求字形墨迹或像素取整结果永远落在 4 DIP 栅格
- `compact.minHeight` 和 `expanded.*MinHeight` 是最低基线，不能写成固定 `height` 后裁切
- `rimDecorative` 只做分层，不是控件边界或唯一状态信号；不能拿装饰线对比度替代焦点环要求
- `progressTrack` 只用于黑色 surface 上的轨道，对黑底约 3.66:1；它作为小文字颜色仍不合格。移到 raised/hover/pressed 表面时须换用能满足 3:1 的颜色，不能直接复用 [W9]
- 所有状态文字在 raised、hover、pressed 等实际组合上分别算对比；仅黑底通过不代表全局通过
- `maxStoredActivities` 是活动摘要上限，不是消息正文留存许可；隐私设置可进一步减少或禁止保存

## 5 信息层级与排版

### 5.1 每个状态只回答一个主要问题

| 稳定状态 | 主要问题 | 必须显示 | 默认不显示 |
| --- | --- | --- | --- |
| idle | 入口在哪里 | 可识别的入口轮廓；可选中性标记 | 广告、随机引言、闪烁、虚构“正在监听” |
| compact | 什么任务正在进行 | 身份图标、一个主状态或关键数值 | 多段正文、多个小按钮、滚动跑马灯 |
| expanded | 我能做什么 | 标题、必要上下文、清晰主操作、收起入口 | 复杂设置、无限历史、大型表单 |

[PROPOSED] 无活动时保持 idle，但必须允许用户从设置完全隐藏静默岛。若显示麦克风、摄像头等隐私状态，只有来自真实且获授权的数据源才显示；不做装饰性的录音灯。

### 5.2 字体与数字

[APPLE-HIG] Apple 针对 Dynamic Island 建议 Medium 或更重的文字。[A1] 本项目把它映射为正文/辅助文字 500、标题 600，属于 Windows 字体的具体选择 `[PROPOSED]`。必须检查最终中文 fallback 是否真正提供相应字重；CSS 数值不保证每种字体产生相同视觉重量。若 fallback 只能提供 400/700，不得假装 500 已被精确渲染；记录真实回退，并选可读的可用字重或更换获授权字体。

[WINDOWS-SPEC] Windows 文字缩放与显示缩放是独立设置，Microsoft 建议界面能随文字调整而重新排版。[W2] Windows 字体栈采用本地可用的 Segoe UI 与中文回退，不依赖 Apple SF 字体是否碰巧安装，也不把 SF Pro/SF Symbols 资源视为可任意打包的跨平台素材。[A6]

- MUST 不为全局文本选择等宽字体；只有计时、进度数值等使用等宽数字特性
- MUST 为动态数字预留最大合理值宽度，例如计时器进入小时后允许 `1:02:03`；`tabular-nums` 不能阻止字符数量增加导致的宽度变化
- SHOULD 对日期、进度、百分比使用地区格式化；`12:34` 等结构可包在 `bdi` 或显式 LTR 隔离中
- MUST 使用实际最终字体测量，不得用“字符数 × 字号 ÷ 2”估算中文或混排宽度
- MUST NOT 为某个时间戳单独压缩 letter-spacing 或水平缩放字体
- 标题默认单行省略；正文预览最多两行。完整文本通过展开详情、主应用或可访问描述获得；不能只放在鼠标 tooltip
- 用户放大文字时，优先让元数据换行、按钮分行、卡片增高，然后才对非关键摘要省略

### 5.3 图标

[PROPOSED] 图标保持单一风格和可识别轮廓。18 DIP glyph 位于 24 DIP 对齐盒；18 DIP 不是点击目标尺寸。播放器按钮视觉图标 18，交互目标至少 32；触摸模式目标优先 44。

MUST 为图标按钮提供动作名称，例如“暂停播放”“继续下载”“收起”；不能只命名“播放图标”。播放/暂停可使用**名称随下一次动作改变的普通按钮**，例如“暂停播放”，此时不再机械加 `aria-pressed`。真正 toggle button 则使用**稳定名称加 `aria-pressed`**，例如固定名称“静音”及按下状态；不要同时变化名字和叠加含混的 toggle 状态。[W12]装饰图标从可访问树中隐藏。使用开源或自有图标时须记录许可，不能仅因 Apple 截图可见便复制 SF Symbols 资产；系统图像用途还需遵守相应许可。[A7]

### 5.4 颜色与材质

[APPLE-API] Apple 的原生 Dynamic Island 黑底不可由活动随意自定义。[A4] Windows 不受该 API 规则约束；本项目的默认外壳仍选择不透明纯黑 `[PROPOSED]`。桌面浅色壁纸依靠黑色实体边界，深色壁纸依靠弱轮廓与阴影分层。字体和按钮承担主要可读性；没有“黑色自动高级”的例外。

[WINDOWS-SPEC] CSS `backdrop-filter` 处理的是页面合成链中的后景，不保证能采样另一个桌面应用；在它上方绘制 100% 不透明黑色会遮住该结果。[W3] 若今后启用 Windows 原生材质，必须独立验证 Tauri/系统版本、截图表现、低功耗、远程桌面和无障碍模式。材质失败时回退为本规范的不透明外壳。[W4][VERIFY]

- MUST 同时用文字或图标表达成功、警告、错误，不能只有绿、橙、红点
- MUST 在 `forced-colors` 模式切换到系统颜色语义；非必要阴影、模糊和位图底图关闭
- MUST 保留清晰焦点环；不要全局 `outline:none`
- SHOULD 在 HDR、不同桌面亮度和浅深壁纸下检查边界；不得用壁纸采样自动改变文字颜色而造成跳闪
- MAY 用来源应用的封面主色作小面积身份提示；不得牺牲文本对比度或误导状态语义

## 6 布局算例与真实预算

### 6.1 紧凑态算例

默认主体 `280 × 40`，左右 padding 各 12，上下各 8。使用三列：24 DIP 身份盒、弹性标签、64 DIP 关键数字列，列间各 12。

```text
横向：12 + 24 + 12 + 144 + 12 + 64 + 12 = 280
纵向：8 + max(24 图标盒, 20 标签行高) + 8 = 40
```

右侧 64 来自 `templates.compactExample.indicatorWidth`，是该**具体模板的预留宽度示例**，不是全球固定 trailing token。若数字实际测量大于 64，缩短可选标签或使用另一紧凑模板，不能截断核心数字。

在 200% 文字缩放时，20 行高变 40，紧凑高度至少 `8+40+8=56`。字串放不下时，先删除非关键标签保留身份与数值，仍不足就切为可增高的摘要布局。触摸模式若整岛作为唯一按钮，高度至少满足 44；不得缩在 40 高视觉壳外增加不可见点击条。

### 6.2 简单通知卡算例

带两行正文与操作的默认通知主体 `400 × 168`；它覆盖通用简卡最小高度 160。左右 padding 各 20，可用宽 360。头部为 40 图标、12 gap、264 内容、12 gap、32 关闭目标：

```text
横向：20 + 40 + 12 + 264 + 12 + 32 + 20 = 400
头部 40 高：标题 20 + 间隔 4 + 元数据 16
纵向：16 + 40 + 12 + 40 正文两行 + 12 + 32 操作行 + 16 = 168
```

此模板的两个段落间距由 `templates.notification.sectionGap=12` 定义。短正文、无操作等低密度简卡可以使用 160 的通用最小高度；含两行正文与操作必须从 168 起测量。实现 MUST 按内容增高，不得为了“160”而压缩段落间距或删除文字区域。

关闭按钮单独占 32 列；`2m ago` 或“2 分钟前”放在内容列的元数据行，不与关闭共享 36–48 DIP。头像只在头部占左列，正文与操作是否横跨整个内容宽由模板定义，不能在空白头像列下面机械留洞。

### 6.3 媒体卡算例

默认主体 `400 × 192`。宽度同上，可用 360。头部 56 高，可放 40 封面和标题/作者；底部留出数值行、进度及媒体按钮。

```text
纵向：16 + 56 头部 + 12 + 20 时间行 + 4 + 4 进度 + 12 + 44 控制行 + 24 = 192
```

此例头部、控制行和底部 padding 由 `templates.media` 覆盖通用默认值；主控制目标高 44，为桌面与触摸兼容的具体模板决策。与通用 `buttonMinHeight=32` 不冲突，后者只是下限。时间行采用两端对齐，`已播放 / 总时长` 不得让进度条成为唯一进度表达。

### 6.4 文字放大与窄屏

候选主体宽度：

```text
preferredWidth = min(400 + 160 * max(0, textScale - 1), 560)
availableBodyWidth = max(0, anchorRect.width - 2 * 16 - 2 * earRadius)
bodyWidth = min(preferredWidth, availableBodyWidth)
```

这里的减去耳角是为了总视觉边界不超出可用区。实际窗口效应范围还须单独留给阴影，不能因此缩窄可见内容而不更新公式。

MUST 将头部改成可重排结构：文字优先、关闭目标保留、时间落到下一行、非关键封面允许隐藏。低于能容纳控件的宽度时提供独立正常窗口，不继续压缩一个无法使用的小岛。

卡片可见高度上限为 `min(480, availableHeight × 0.6)`，该值是偏好上限，不是硬裁切线。若正文更长，内容区可滚动并保留可达关闭/主操作；若连固定操作都放不下，转入普通窗口。滚动条必须可发现，不能只用无边界遮罩。

## 7 内容模板

### 7.1 媒体

- compact：来源/封面标记 + 曲名短摘要或播放状态；暂停状态明确，不让不断跳动波形暗示仍在播放
- expanded：封面、曲名、作者、播放时间、进度、上一首/播放暂停/下一首。音量等次级控制 MAY 移到主应用
- `position` 应由基准时间与播放状态推导，不必每帧跨 IPC 请求；跳播、暂停、恢复使用来源数据校正
- 无时长直播显示“直播”，不伪造 0–100% 进度；不能跳播的来源不给可拖动 slider
- 封面失败使用固定占位尺寸，禁止图片加载后改卡片高度
- 若操作失败，保留当前可信状态并给出“未能暂停，重试”；不要只乐观变成成功且永久不回滚

### 7.2 计时器

- compact：计时图标与剩余时间，使用稳定数字列
- expanded：计时名称、剩余时间、暂停/继续和结束。结束任务与收起入口分开
- 基于单调时钟及截止时间推导剩余时间；应用挂起或系统休眠后用可信时间源重算，不能继续播放旧的逐秒动画
- 到期转成明确 `expired`，避免负数；倒计时结束是有意义的状态变化，可公告一次
- 每秒刷新不可通过读屏每秒播报；用户聚焦时能查询当前值
- 若计时用途涉及医疗、安全或其他高风险场景，不能把桌面覆盖组件当作保证送达的警报系统

### 7.3 通知

- compact：来源 + 一句事件摘要；显示权限、锁屏和分享设置优先于正文
- expanded：来源或发送者、时间、正文预览、一个主操作，最多两个同层主要动作
- “收起”只是关闭展开；“隐藏这条”将该通知从岛中移除；“标为已读”只有数据源提供并且用户触发时才调用
- 自动预览超时只影响临时展示，不删除真实消息；鼠标正在其上、键盘在卡内、菜单打开或读屏正在交互时暂停超时
- 多通知用队列与聚合，不反复替换用户正在阅读的卡片；过期摘要不在用户回来时逐条补弹
- 快捷回复涉及输入法、隐私和发送后果。V1 SHOULD 跳转来源应用；若实现行内回复，必须支持 IME、明确发送按钮、发送中状态及防重复，绝不把 Enter 与 Escape 行为写死到组合输入事件上

### 7.4 下载或长任务

- compact：来源图标 + 百分比或“处理中”，不能仅靠一条极细进度线
- expanded：文件/任务名、已完成/总量、速度或阶段、暂停/继续、取消
- 已知总量用确定进度；总量未知用“处理中”或温和 indeterminate 指示，不能捏造百分比
- 取消任务是业务动作，与隐藏界面分开；破坏性的取消需要遵守任务自身确认规则
- 完成显示结果和“打开”入口；失败展示可行动原因与重试，不无限旋转
- 总量变化时百分比可能回退，必须来自真实数据；不得为“看起来流畅”冻结真实错误

### 7.5 公共数据契约

以下为字段定义，不是另一份 token JSON：

```ts
type Activity = {
  id: string;
  sourceId: string;
  kind: 'media' | 'timer' | 'notification' | 'download';
  revision: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'expired';
  title: string;
  summary?: string;
  updatedAt: string;
  expectedFreshUntil?: string;
  sensitivity: 'public' | 'private' | 'sensitive';
  progress?: { mode: 'determinate'; value: number; max: number }
           | { mode: 'indeterminate' };
  actions: Array<{ id: string; label: string; enabled: boolean; destructive?: boolean }>;
};
```

MUST 校验来源、长度、revision 和动作白名单。文本按纯文本渲染，不能把消息内容插入 HTML；本地或远程图片的读取/请求策略须有独立权限控制。`sensitive` 不意味着可以自动收集敏感内容，它只是已经合法取得数据的显示策略。

## 8 状态机与打扰管理

### 8.1 将业务状态与动画状态分开

`Activity.status` 描述任务，`stableView` 描述岛体，`transition` 描述进行中的视觉变化。不能用一个 `isExpanded` 布尔值同时表示“用户想展开”“动画结束”“有可操作焦点”。

建议维护：`stableView`、`targetView`、`transitionId`、`selectedActivityId`、`openReason`、`focusOwner`、`suspendedReason`。`openReason` 至少区分 `explicit` 与 `preview`。显式打开不会因鼠标离开而关闭。

稳定状态：`hidden`、`idle`、`compact`、`expanded`。过渡状态：`expanding`、`collapsing`、`replacing`。暂停显示的原因独立记录，例如锁屏、全屏策略或用户隐藏；不能丢失底层计时任务。

### 8.2 状态事件矩阵

| 当前情况 | 事件 | 结果 | 焦点与播报 |
| --- | --- | --- | --- |
| idle，无活动 | pointer enter | 只做轻微悬停反馈 | 不获取焦点、不播报 |
| compact | pointer enter | 原状态，突出可操作入口 | 不自动完整展开 |
| idle/compact | 点击、Enter、Space 或已注册入口快捷键 | 显式 expanded；无活动时显示简洁入口内容 | 仅显式键盘开启按规则移动焦点 |
| expanded explicit | pointer leave | 保持 expanded | 不把焦点还给桌面 |
| expanded | Escape 或收起按钮 | 回到有活动的 compact，否则 idle | 退回合法触发器；不强行激活别的应用 |
| compact/idle | 新普通活动 | 更新/进入 compact | 不抢焦点，必要时一次 polite 状态公告 |
| expanded explicit | 同级新通知 | 保持当前活动，记录未查看数 | 不重置 Tab 顺序与输入 |
| 非交互中 | 用户允许的临时通知预览 | preview expanded，启动可暂停超时 | 不获取输入焦点 |
| preview expanded | 用户点击其内容或键盘进入 | 升级为 explicit，取消自动关闭 | 保留当前位置 |
| preview expanded | 超时且无指针/焦点/菜单占用 | compact 或 idle | 不播报“收起” |
| 任意动画中 | 反向操作 | 从当前呈现值转向新目标 | 取消旧完成回调 |
| 任意状态 | 数据源停止且已过 expectedFreshUntil + staleGrace | 标记“暂未更新”，停止伪实时动效 | 仅状态改变时公告 |
| 任意状态 | 锁屏或隐私屏蔽 | 隐藏敏感展示；保留合法后台任务 | 不在锁屏额外播报私密正文 |
| 任意状态 | 显示器变化/DPI 变化 | 重新计算锚点与布局后提交 | 保留活动和显式打开意图 |
| 任意状态 | 用户退出应用 | 停止展示与清理资源 | 如有会被终止的任务，按实际业务给出确认 |

### 8.3 展示优先级

[PROPOSED] 默认优先级从高到低：平台/隐私遮蔽 → 当前用户直接操作 → 经用户允许的重要状态变化 → 运行中的选定活动 → 普通新通知 → 静默入口。

- 用户正输入、拖动 slider、打开菜单时，不允许新事件替换其操作对象
- 同级事件按到达顺序排队；同一活动按 `revision` 合并，旧 revision 不得回写新状态
- 已完成、失败或到期可临时成为 compact 主状态；结束临时展示后返回仍在运行的活动
- 最多一个主活动可见。另有活动时用有名称的切换入口，例如“另外 2 项活动”；它不是可独立乱跳的第二个岛
- 队列容量与摘要存储上限见 JSON；溢出聚合为计数，避免丢失正在进行的用户操作
- 普通消息不要覆盖计时到期；“紧急”必须由经过定义的来源/事件分类提供，不能只因文案包含“紧急”就升级
- 全屏应用默认隐藏岛体；用户可为指定应用或任务允许显示。未经明确选择，不以新通知退出全屏或激活本应用

### 8.4 超时与取消

`notificationPreviewTimeout` 和 `completedCompactTimeout` 均为产品默认值，不是保证用户读完所需时间。MUST 提供关闭自动预览或延长展示的设置。超时从可见且可读时开始，不从数据到达或动画开始时倒数。

MUST 在 hover、focus、菜单和用户操作期间暂停。恢复时保留剩余时间，不能在鼠标移出后立即闪退。MUST 对重复到达的数据去重，不能每次数据 tick 都重开超时。

## 9 动效系统

### 9.1 先纠正物理模型

[APPLE-API] SwiftUI 的 `response` 是与弹簧刚度相关的近似时长参数，不能当作“必在 0.44 秒结束”的硬时间；`dampingFraction` 相对于临界阻尼，0.74 属于欠阻尼。[A3]

[WINDOWS-SPEC] GSAP 的 `elastic` 是时间归一化的 easing 函数，可用振幅和周期调整视觉响应，不是自动接收 SwiftUI 的 stiffness/damping/velocity 模型。[G1] `back`、三次贝塞尔和物理弹簧同样不是可互换参数格式。

[PROPOSED] 1.1 默认恢复此前选定的轻弹簧展开：宽度使用 `motion.expand.spring` 的归一化响应，允许有界小超调；高度与收回保持单调 `power3.out`。这不是物理速度连续模拟，更不是 Apple 内部参数。固定画布与原生轮廓交接另行验收，不能用曲线遮掩闪烁。

Apple 对 widget/Live Activity 数据更新动画还存在系统管理的时长等限制，但这些 API 约束不是 Windows 450/320 ms 的来源。[A9]

### 9.2 时间线（恢复旧版流畅路径）

离开当前视图先保留旧视图并在 55ms 内退出；随后新内容按最终宽高排版，测量其固有高度后开始形变。隐私/权限变化必须立即剔除敏感 DOM，不能为退场保留旧患者内容。

| 动作 | 本产品默认 | 约束 |
| --- | --- | --- |
| 展开外壳 | 几何阶段延后 25ms，持续 540ms | 宽度使用旧版 ζ=.84、ω=13 归一化响应；只允许一次小超调，高度 power3.out 单调 |
| 收回外壳 | 几何阶段延后 70ms，持续 340ms | power3.out；leave 不重启整个退场；不恢复原生 HWND 收紧 |
| 内容进入 | 几何阶段延后 60ms，180ms 淡入 | 水平位移最多 4 DIP；文字 scale=1，无 blur，无逐帧重排 |
| 同类内容更新 | 160ms 淡化，几何不变不重做外壳动画 | 计时 tick 不启动入场；焦点和来源状态保持 |
| 减少动态 | 0ms 视觉形变 | 最终原生轮廓和语义仍正确；原生交接延迟不算动画 |

实际端到端时间还包括短暂退出、内容测量及有界原生交接。不能把“540ms 外壳曲线”说成所有设备在 540ms 内完成。内容在最终排版尺寸内呈现，外壳使用 SVG 几何裁切，文字不缩放。

### 9.3 动画可中断契约

MUST 将每次目标变更赋予递增 `transitionId`。新命令进入后：读取当前视觉值 → 取消旧 timeline 与完成回调 → 保留已呈现位置 → 对每个目标布局版本测量一次 → 生成新 timeline → 仅当前 ID 的完成回调可提交状态。

字体加载、系统文字倍率、可用区或 DPI 变化会产生新的布局版本，因此允许重新测量；“一次”指同一版本没有反复读写布局，不是永远禁止后续测量。

`kill()` 本身不等于自然反向，直接启动固定初值的 `fromTo` 可能跳帧。SHOULD 用 GSAP 当前值重定向或经过验证的反向 timeline；若使用真实弹簧还需连续速度。`quickTo` 的当前值重定向也不等于弹簧速度继承。[G2] V1 不承诺连续速度的物理弹簧，但 MUST 不发生位置跳变。

### 9.4 悬停与微反馈

- hover 只调整填色、图标亮度或轻微轮廓；不改变原生窗口尺寸，不自动全展开
- pressed 可调整按钮背景；不缩放整岛、不给文字施加模糊
- 禁止用 moving shell 的 `mouseenter/leave` 来递归决定自身大小
- 禁止无意义的持续呼吸、循环缩放与全彩波形；真实录音/媒体指示也必须受减少动态效果及电量策略控制
- 数据刷新保持平静：进度更新可平滑插值，数值文本不做滚动翻牌，错误和完成只有一次明确转变

### 9.5 可选物理弹簧实验（不是 1.1 默认曲线）

若未来启用速度连续的物理积分实验，必须记录质量、刚度、阻尼、初始速度、终止阈值或明确的物理模型，给出位移曲线与超调测试；不要只写“像 iOS”。理论二阶线性系统在单位阶跃、静止初值下，0<ζ<1 为欠阻尼，ζ=1 为临界阻尼，ζ>1 为过阻尼。理论模型说明不能证明 Apple 系统实际使用同一参数。

默认关闭的具体实验起点见 `motion.springExperiment`：取质量 m=1、阻尼比 ζ=0.74，选择 ω₀=2π/0.44≈14.28 rad/s，则 k=mω₀²≈203.92，c=2mζω₀≈21.13。这里把 0.44 当作本项目的周期约定，**不是证明 SwiftUI response 与 ω₀ 存在该恒等式**。以上近似值由 JSON 中公式推导，不能再复制为第二份权威配置。

```text
x'' + 2ζω₀x' + ω₀²(x-target) = 0
静止初值的理论首个超调比例 = exp(-πζ / sqrt(1-ζ²)) ≈ 3.15%
```

使用解析求解或经测试的积分器，不能把掉帧后的大 dt 直接喂给不稳定的显式 Euler。单一 owner 保存 position、velocity、target；中断时保留当前 position/velocity，仅更新 target。误差小于 0.25 DIP 且速度小于 2 DIP/s，连续 3 次样本后精确落到目标并停止 ticker。该终止规则不保证固定 450 ms，启用实验时不得继续把主时间线总长当弹簧沉降承诺。

这条实验路径不得覆盖 reduced motion，并且不能让形状越过屏幕顶边或把 native envelope 逐帧拉大。必须事先验证全部中间态满足 `h>=e+r` 等几何条件并为真实超调留空间；不能先允许无效路径，再靠硬裁切掩盖。未通过阶段门则明确回退静态路径并报告；不得把静态加淡入冒称为连续原生形变。

## 10 Windows 与 Tauri 2 原生交互契约

### 10.1 职责分离

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Rust 原生层 | 显示器/DPI、窗口位置、平台输入边界、显示策略、来源数据权限、生命周期 | 每个文字 tick 调整 HWND、猜测 DOM 的行数 |
| React | 内容语义、最终布局、焦点和键盘、事件 reducer、可访问树 | 直接在 render 中调用窗口移动/resize |
| GSAP | 可中断的视觉过渡、有限的属性插值、清理 timeline | 业务真值、独立维护第二份 expanded 状态 |
| 共享 contract | tokens、ShapeModel、状态事件、逻辑与物理坐标转换 | 隐式的魔法常量与散落全局变量 |

[VERIFY] Tauri 和 WebView2 的具体 API、权限与平台表现需按项目锁定版本核实。本规范是能力契约，不保证某个单一高层 API 就能完成精确透明区命中。[T1]

### 10.2 稳定窗口包围框与有界轮廓交接（1.1）

同一显示器/DPI 下，idle、compact、expanded 共用从所有尺寸上界、实际小超调和物理抗锯齿余量推导的固定 canvas。正常打开/收回/悬停的 HWND move/resize 必须为 **0 次**；仅启动或显示器条件改变时允许重新定位。canvas 不是输入矩形，不使用全屏透明窗。

MUST NOT 在动画帧、pointer move 或数据 tick 中 resize HWND。1.0 把 region 与 resize 一并逐帧禁止的条款在此精确修订：**允许仅在有限形变期间进行轮廓交接**，单个在途请求，同一帧合并到最新目标，携带 epoch、递增 sequence 和阶段。原生先安装前一已绘制轮廓与下一轮廓的并集，ACK 后绘制下一帧，最终绘制后收敛为精确轮廓。并集不是整个起终点大矩形，也不承诺过渡边缘绝对零延迟。

空闲无 RAF/鼠标轮询/轮廓刷新。完成、取消、卸载、减少动态切换均释放 timeline、计时器和队列；晚到旧回复不允许绘制。必须分别报告 HWND 变更次数和有限 HRGN 更新次数，不能借“零 resize”隐去开销。双帧最终收敛有 100ms 遮挡兜底，整体有界超时 1500ms。

外阴影本轮保持关闭，不扩大透明输入区域。透明角、旧详情区域和 canvas 余量必须真实点击到合成背景窗口。当前路径未通过原生实测时必须明确标记降级，不得只以 rAF≈60fps 代替绘制连续性。

### 10.3 输入形状的实现边界

- `CSS pointer-events:none` 只改变网页内部命中规则，不定义 Windows 后方应用是否得到点击
- 整窗忽略鼠标适合完全非交互展示，不等于可以保留岛上按钮而只穿透周围区域
- 鼠标落在 visualShape 内，必须到达本产品；落在壳外但 envelope 内，必须到达背后的正确窗口
- 阴影、透明圆角、耳角外侧、未使用的展开包围框必须纳入真实跨应用测试
- 若采用 `WM_NCHITTEST`、分层窗口或 region 路线，MUST 核实其线程/进程和合成条件，不照搬网络片段后宣称工作
- 形变中需要精确 shape 时，原生层与视觉层必须消费同一过渡定义；遵守 10.2 的有限、单在途、可取消轮廓交接；不得无条件全窗口重绘或保留无限 IPC 队列

[WINDOWS-SPEC] `WM_NCHITTEST` 中 `HTTRANSPARENT` 的文档描述涉及同一线程的下层窗口，不构成任意跨进程应用鼠标穿透的保证。[W10] 不能把返回 -1 当成已完成本需求。

**必须按阶段门启用功能：**

1. 静态矩形可见小窗：先证实输入、焦点、DPI 都正常
2. 静态非矩形外壳：证实所有透明区能穿透到其他进程应用，并且壳内可交互
3. 动态外壳：在前两项通过后，才验证动画中命中同步。未通过时使用瞬时几何提交加内容淡化，或者保持可见小窗，不启用壳形变

若选择 `SetWindowRgn`，须理解它限制的是窗口显示区域，并非只设置输入 mask；同一 HWND 的壳外阴影可能随之被裁掉。该路线可禁用外部阴影，或使用另行验证的渲染/输入分离方案，不能同时声称 region 紧贴壳体且同窗阴影完整保留。它的坐标相对于 window 而非 client；调用成功后 region 所有权交给系统，Rust 资源封装不能再重复释放。[W13]

一种**候选**架构是：原生层保存已确认的 transition ID、起止几何和共同时间基准，在命中查询时求值 `ShapeModel(t)`；WebView 使用同一过渡定义绘制。它避免每帧 HRGN 和 IPC，但时钟映射、WebView 合成延迟、原生线程调度仍可能造成差异，必须实测。相同 easing 字符串和开始时间不足以保证屏幕上的边缘与输入边缘同步。允许选择其他经验证的原生方案，但不能跳过阶段门。

若路线无法可靠呈现同步输入，MUST 禁用相关动态形变。验收观察的是正确输入路由和稳定性能；“调用了某个 API”本身不是通过标准。

### 10.4 DPI 与多显示器

[WINDOWS-SPEC] Windows 每显示器 DPI 感知流程会涉及 DPI 变化及窗口建议矩形。[W5] 必须以目标窗口/显示器的有效 DPI 处理，不能始终沿用进程启动时的主显示器倍率。

- 处理负坐标的副显示器、竖屏、不同倍率并存、主副屏切换、拔插、远程连接和休眠恢复
- 显示器变化时取消或完成当前视觉过渡，重算布局并原子提交；禁止旧 monitor 数据反复覆盖新位置
- 拖拽移动到别的显示器如果属于产品功能，必须有明确可见把手或设置操作；普通内容区不应意外拖动整窗
- 保留逻辑 DIP 和用户选屏意图；不要把一次物理位置永久保存为所有机器通用值
- 1 DIP 装饰边在 125% 可能落于亚像素。允许抗锯齿，不通过任意加减整数使不同 DPI 下整体漂移

### 10.5 跨层异步与生命周期

[PROPOSED] 单个 `transitionId` 不足以防止原生异步操作乱序。测量、prepare、ACK、commit 必须携带 `sessionEpoch`、`layoutRevision`、`transitionId` 和 `monitorGeneration`。新 WebView/窗口会话递增 epoch；系统文字、字体、可用区变化递增布局版本；显示器/DPI 更新递增 monitor generation。

MUST 在前端收到异步结果时和 Rust UI 线程**真正执行窗口修改前**都复核版本。已经排队的旧 resize 不会因为 GSAP `kill()` 自动撤回。原生操作应串行化并只执行仍有效的最新意图；过期 ACK 不能让 reducer 回到旧状态。不要边持共享锁边等待 UI 线程回调，也不要让 UI 线程同步等待自己需要处理的工作。

[WINDOWS-SPEC] 直接使用 WebView2 对象时要遵循其 STA UI 线程与消息泵要求。[W11] Tauri 公共 API 可能已经做了适当分派，不能反过来写成“所有 Tauri 方法都必须手工 main-thread”。只在已确认需要的原生/COM 调用边界使用框架支持的主线程分派。

React 的 setup/cleanup MUST 对称，尤其要覆盖异步 `listen()` 尚未返回解除函数时已经卸载的情况：标记 disposed，返回后立即解除，回调进入时先检查会话是否还有效。GSAP context 不会替你移除任意原生监听器、ResizeObserver、timer 和自建 ticker；延后创建的动画应被 `contextSafe` 或明确 owner 管理。[T3][R1][G3]

### 10.6 Agent 常见误解与验证边界

本表是实现前检查项。`正确边界` 中的产品约束为 `[PROPOSED]`；列出的 API 行为依据为 `[WINDOWS-SPEC]`。每一行都必须能对应到测试或明确的功能降级。

| 常见误解 | 可能后果 | 正确边界 | 怎么验证 |
| --- | --- | --- | --- |
| 同一 ShapeModel、同一 easing 就自动帧同步 | 合成延迟时可见外壳与输入边缘错开 | 同源公式只是前提；跨层同步另过阶段门，失败即关闭壳形变 | 停帧、反向、失活、透明角、真实后方应用 |
| `HTTRANSPARENT` 可穿透任意应用 | 同线程示例成功，桌面其他应用仍被挡 | 文档条件不能扩展到任意跨进程；静态与动态都需实测 [W10] | 前后窗口不同进程，捕获鼠标中与未捕获中 |
| CSS 透明就是 native alpha=0 | 截图透明但点击被吞 | 分层窗口有自己的合成/命中条件，WebView CSS 透明不能直接证明满足 [W14] | 透明背景、耳角外、阴影、空 envelope |
| SetWindowRgn 只改输入区域 | 阴影消失、绘制被切或 HRGN 重复释放 | region 还控制绘制范围、使用 window 坐标；成功后所有权转交系统 [W13] | region 变更与销毁，窗口/client 偏移，阴影截图 |
| `transitionId` 只保护 onComplete 就够 | 旧 invoke/测量/ACK 晚到，窗口恢复旧大小 | epoch、布局版本、显示器代际贯穿原生执行前检查 | 人为延迟 ACK、倒序测量、重建 WebView |
| `useEffect([])` 永远只跑一次 | StrictMode/HMR 后监听重复、内存和回调泄漏 | setup/cleanup 对称，异步监听返回也需解除 [R1][T3] | mount-cleanup-remount，监听未返回时卸载 |
| `kill()` 或 GSAP context 清除全部资源 | 原生 listener/timer 仍更新卸载组件 | 外部订阅和 ticker 逐项归属与显式释放 [G3] | 多轮展开、卸载、重启后事件计数不增长 |
| Rust async/Send 等于 COM 线程安全 | WebView2 线程错误或死锁 | 直接 COM 遵循 STA/UI 线程；正确使用框架分派，不在锁内互等 [W11] | 后台更新与窗口关闭/重建并发 |
| Tauri 2 方法存在就有权限且系统支持 | 权限拒绝被误判为 CSS 问题 | 区分前端 capability、Rust 入口与 OS 支持；只授必需窗口 scope [T2] | 拒绝权限、错误 label、不同系统/runtime |
| DPR、scaleFactor、textScale 都乘上更安全 | 双倍缩放、混屏漂移或超大窗口 | 逐字段标域，只在边界换算一次；physical origin 不缩放 | 负坐标混合 DPI，运行时文字倍率和 zoom |
| 不抢焦点等于永远不可激活 | 鼠标能点，键盘和 IME 永远无法进入 | 被动显示不激活，用户显式进入时可聚焦；DOM focus 不授予 OS 前台资格 | 后方编辑器不断字；快捷键/托盘进入可操作 |
| WinUI 文字缩放文档自动适用于全部 CSS | 225% 设置下仍是小字，或重复放大 | WebView 字体与系统设置桥接待验证，一次应用并重新测量 [W2] | 15 组合加运行时修改和字体迟到 |
| 每帧 native resize 能保证“真实变化” | IPC、布局、窗口区域形成反馈振荡 | 稳定 envelope 和阶段门；变化监听不无条件触发回写 | 记录调用数和因果链，不只看动画截图 |
| 统一 `scale()` 能省布局计算 | 中文模糊、图标拉伸、命中不对应 | 壳体 clip/几何与文字最终布局分离 | 中途暂停截图，正文无挤压重排 |
| tooltip 足以补救省略和小字 | 触摸、键盘和读屏无法访问完整信息 | 关键内容有显式详情或可访问路径 | 无鼠标完成全部任务 |
| 名称随动作变化再加 pressed 总是更好 | 读屏宣布含混双重状态 | 普通动作按钮与稳定名称 toggle 二选一 [W12] | 检查名称/角色/状态及实际读屏结果 |
| aria-live 越多越无障碍 | 每秒数字不断打断 | 只公告有意义的离散状态，视觉副本隐藏 | 计时和下载连续运行，听完整读屏过程 |
| 模糊、阴影和置顶天然免费 | 高 GPU/合成开销，窗口裁切和遮挡 | 可选材质必须实测，阴影空间独立预算 | 低端集显、远程桌面、浅深壁纸 |
| “看起来像苹果”代表完成 | 没测 DPI、焦点与隐私的样例被当成产品 | 来源事实、提案和实测结果严格分开 | 按第 14 章报告通过/失败/未覆盖 |

### 10.7 焦点与置顶

默认新通知不激活窗口，不夺走编辑器、游戏或会议的输入焦点。用户点击实际可交互内容时，原生窗口应允许正常键盘交互；MUST NOT 永久采用无法获取焦点的窗口标志，再以鼠标专用按钮假装可访问。

始终置顶只在正常桌面显示策略中使用。全屏、系统锁定、任务视图、虚拟桌面、UAC、安全桌面和屏幕共享必须分别测试。不得承诺绕过系统限制。

## 11 无障碍与输入规范

### 11.1 语义结构

折叠入口使用原生 button 语义或等效可访问实现，并有动作名称、`aria-expanded` 和被控制区域关联。展开内容默认是有名字的非模态 region；不机械使用 `role=dialog`、`aria-modal=true` 或 trap focus。真正模态确认窗才使用模态规则。[W6]

使用真实 button、input/range、progress 等合适元素。`div onClick` 不是默认可接受替代。折叠隐藏内容从 Tab 顺序与可访问树移除；仅 `opacity:0` 不够。

### 11.2 键盘与焦点

| 输入 | 预期 |
| --- | --- |
| Tab/Shift+Tab | 在已获焦点的 WebView 内按逻辑顺序导航，不困住用户；不承诺 Tab 到末尾会自动切到背后应用 |
| Enter/Space | 激活当前按钮；Space 不应同时滚动和激活 |
| Escape | 先关闭最内层菜单/弹层，再收起岛；IME 组合阶段不得误触 |
| 方向键 | 仅在 slider、菜单、列表等有明确键盘模型的控件中处理 |
| 应用快捷键 | 可配置、冲突可见；注册失败给出说明，不接管常用系统组合键 |
| 托盘入口 | 无鼠标悬停能力时仍可显示岛、打开主窗口/设置和退出 |

- 键盘显式展开后，焦点移到合理的首个操作或有名称内容起点；鼠标展开不需要机械跳焦点
- 收起前若焦点位于即将隐藏的区域，移到保留的折叠入口；若应用失去前台资格，不强制激活外部来源窗口
- 新事件、进度更新与文字重排不得销毁当前聚焦元素；使用稳定 key
- 控件禁用要有可理解原因；请求进行中防止重复执行，但不要把焦点无故移走
- 焦点环用 2 DIP、在外壳内保留空间；不能被 overflow clip 切掉

### 11.3 读屏与实时状态

[WINDOWS-SPEC] WAI-ARIA 的 status/live region 可用于不搬动焦点的状态公告，但角色与公告时机仍需真实辅助技术测试。[W6][W7]

- MUST 在 Windows Narrator 和至少一种目标用户常用读屏上测试 WebView2 可访问树；Apple 的标签建议只能提供设计参照，不能代替此测试 [A8]
- 计时每秒变化、媒体位置、下载每个百分比默认不 live announce
- 只公告用户关心的离散事件：开始、暂停、完成、失败、到期；普通变化 polite
- assertive/alert 只用于明确需要立即关注的关键事件，不能把所有通知升级
- 不重复宣布应用名、标题、内容、隐藏镜像四遍；用于交叉淡化的视觉副本必须 `aria-hidden`
- 隐私隐藏后，可访问名称与 live region 同时隐藏私密内容；不能视觉上打码但读屏仍读出正文
- 带百分比的 progress 提供范围和当前值；未知进度不能提供假的 `aria-valuenow`

### 11.4 文字缩放与触摸

必须覆盖 100%、200%、225% 文字缩放；这是独立于系统 DPI 的测试维度。[W2] 同时提供 Windows 设置变化的响应途径；不能假设 WebView 自动把 WinUI 的文字缩放规则应用到所有 CSS 字号 `[VERIFY]`。

WCAG 2.2 的 AA 目标尺寸标准有 24 CSS px 的基线及间距等例外；本产品选择更保守的 32 DIP 鼠标目标和优先 44 DIP 触摸目标。[W8][PROPOSED] 不得把“本规范 44”说成 Windows 所有控件必须 44 的官方规则。

触摸没有 hover。全部功能必须通过点击、键盘或触摸到达；不得把“鼠标停留后才出现关闭”当作唯一入口。

### 11.5 减少动态效果与高对比度

- 观察 `prefers-reduced-motion`，并验证它在目标 WebView2 版本与 Windows 设置间是否同步；必要时原生桥接 `[VERIFY]`
- 设置改变时立即更新后续动画；正在进行的动画安全落到目标状态，不倒放已取消过渡
- `forced-colors` 下使用系统语义颜色，保留文本和可见控件边界，不强制原品牌色
- 不要求用户通过颜色区分选中/未选中；增加文字、图标或形状提示
- 页面缩放、系统文字放大与读屏放大镜都不能导致最重要动作永久在屏幕外

## 12 隐私与桌面共存

### 12.1 默认展示策略

- 锁屏前/锁屏期间隐藏私密正文、联系人头像和可能敏感的文件名
- 用户开启“只显示来源”后，视觉、tooltip、日志、无障碍树和剪贴板入口都遵循该设置
- 屏幕共享状态若无法可靠检测，不得承诺自动隐私保护；提供可直接访问的“隐藏内容/暂停展示”开关
- 不把置顶岛视为安全的秘密展示区；内容仍可能被截图、录屏或旁观者看到
- 普通摘要默认最少留存；诊断日志只记录事件类型、时长和匿名 ID，避免完整消息与路径

### 12.2 全屏与任务栏

[PROPOSED] 默认策略：目标显示器进入全屏应用时隐藏岛；另一个显示器上不会因此额外弹出替代岛。用户可为游戏、视频、会议等分别配置，设置名称必须清楚。

任务栏位于顶部或存在系统保留区时，用工作区顶部锚点；有冲突时宁可降低贴顶拟物程度，也不能遮盖系统控件。主应用、托盘和键盘入口始终可用，避免岛被隐藏后用户无法找回。

### 12.3 异常状态

数据断开时显示“暂未更新”或来源断开，不能清空后随机跳回新活动。图片失败、来源权限撤销、动作失败、系统休眠恢复、WebView 重启都要有稳定降级态。重启后不要重新播报所有旧通知；恢复正在运行的活动需要重新确认源状态。

## 13 性能与可观测性

以下为 `[PROPOSED][VERIFY]` 性能预算；实测必须引用当前 evidence，不能从预算推断已通过。

| 指标 | 目标 | 记录方法 |
| --- | --- | --- |
| 输入到首个可见反馈 P95 | ≤100 ms | 时间戳记录实际输入与首帧可见反馈 |
| 60 Hz 动画帧预算 | 16.67 ms/帧 | 浏览器及系统性能工具，检查长帧分布 |
| 120 Hz 动画帧预算 | 8.33 ms/帧 | 真实 120 Hz 显示器验证，不能从 60 Hz 推断 |
| 正常过渡 HWND 几何变更 | 0 次 | 独立记录有限轮廓交接次数；idle 无轮廓更新 |
| 无活动静默轮询 | 0 Hz | 无持续 RAF、间隔轮询和闪烁；保留必要事件订阅 |
| 下载聚合发布 | 默认 250 ms 合并窗口 | 合并高频源更新；完成/失败立即传播，不等下一 tick |

不要把“transform 一定 GPU 加速”或“GSAP 一定 60 fps”写进验收结果。宽高、clip、阴影、滤镜及 WebView 合成开销都受实现影响。应测低端集显、高 DPI、后台负载、远程桌面和电池模式。

SHOULD 记录脱敏的 `transitionId`、from/to、开始/结束、取消原因、测量次数、原生几何调用数和帧时间分位数。禁止记录完整正文或身份信息来分析抖动。

计时文本可按显示精度更新，媒体进度可由时间基准插值。非可见时停止不必要渲染；重新可见时一次性用可信数据同步，不播放积压动画。

## 14 验收测试矩阵

### 14.1 测试状态

本节每一项初始均为 **未执行**。Agent MUST 区分自动化通过、人工实机通过、未覆盖和失败；不得把本规范内的目标值写成已经达成的报告。

### 14.2 显示矩阵

以下每个系统 DPI 都必须执行三种文字倍率；最少 15 个组合。基础用例覆盖 idle、compact、expanded 和展开中反向操作。

| 系统显示缩放 | 文字 100% | 文字 200% | 文字 225% | 核心断言 |
| --- | --- | --- | --- | --- |
| 100% | 必测 | 必测 | 必测 | 字体可读，所有操作可达 |
| 125% | 必测 | 必测 | 必测 | 耳角/边缘取整无错位，点击穿透正确 |
| 150% | 必测 | 必测 | 必测 | 展开布局无重叠，中文无裁字 |
| 175% | 必测 | 必测 | 必测 | 混合倍率切屏不漂移、不循环 resize |
| 200% | 必测 | 必测 | 必测 | 窗口边界和键盘焦点可见，滚动/降级正确 |

另外测试 100% 与 200% 并存的双显示器、负坐标副屏、竖屏、拔插和休眠恢复。页面 zoom 若产品开放，则作为第四个维度，不通过修改 DPI 测试代替。

### 14.3 功能与视觉验收

| ID | 场景 | 必须满足 |
| --- | --- | --- |
| GEO-01 | 每个稳定状态截图 | 顶部锚点固定；底角、耳角无断层；没有窗体白边 |
| GEO-02 | 透明角、阴影、展开余留区点击 | 背后真实应用获得正确点击；岛内控件仍可操作 |
| GEO-03 | 快速点击展开/收起 20 次 | 最终状态与最后一次意图一致，无旧回调复活 |
| GEO-04 | 指针沿耳角和边缘移动 | 无 hover 引起的展开/收缩振荡 |
| LAY-01 | 长中文标题与两行正文 | 不遮关闭、不裁关键动作，摘要可明确省略 |
| LAY-02 | 无空格英文、URL、长文件名 | 容器不超屏；合理断行或省略；完整内容可达 |
| LAY-03 | 阿拉伯语/希伯来语 RTL 混数字 | leading/trailing 遵循方向；时间数字不乱序；逻辑顺序正确 |
| LAY-04 | 200%/225% 文字缩放 | 无通过缩小字体规避；关闭和主操作仍可达 |
| COL-01 | 纯黑、纯白、高纹理壁纸 | 文本与控件清晰，无依赖壁纸巧合的对比 |
| COL-02 | 正常、hover、pressed、disabled、focus | 各状态分别验证对比与可发现性 |
| MOT-01 | 正常和 reduced motion | 两者业务结果/焦点完全一致；减少动态时无弹跳或位移 |
| MOT-02 | 图像迟到、消息替换、计时跨小时 | 不发生无意尺寸跳变或整卡重放动画 |
| WIN-01 | 输入编辑器时新通知 | 不夺焦点、不吞键盘、不改变光标位置 |
| WIN-02 | 全屏游戏/视频、任务栏顶部 | 按策略隐藏或避让，不遮系统入口 |
| WIN-03 | DPI/显示器变化时动画进行中 | 重算后稳定，无跨屏漂移和错误倍率 |
| DAT-01 | 旧 revision 晚到 | 不覆盖新数据，不重播已完成事件 |
| DAT-02 | 来源掉线、权限撤销 | 有可理解降级，停止伪实时指示 |
| PRI-01 | 锁屏、隐私开关、共享模式 | 视觉与可访问树均无敏感正文残留 |
| A11Y-01 | 纯键盘操作四类模板 | 功能完整，焦点可见，不困住 Tab |
| A11Y-02 | Narrator 读取和操作 | 名称/角色/状态正确，无每秒播报与重复正文 |
| A11Y-03 | forced colors | 内容、按钮、进度与焦点保持可见 |
| A11Y-04 | IME 组合输入 | Escape/Enter 不提前关闭或发送 |
| ASYNC-01 | 延迟或倒序测量/prepare/ACK | 仅最新有效代际可提交，无旧窗口操作在之后回写 |
| LIFE-01 | StrictMode 与异步监听未完成时卸载 | 监听器/observer/ticker 全清理，无重复事件 |
| LIFE-02 | 窗口关闭与后台来源更新并发 | 不调用失效 HWND/WebView，不重复释放系统拥有的 HRGN |
| CAP-01 | capability 拒绝或窗口 label 错误 | 明确报错和降级，不扩大为通配权限 |
| PERF-01 | 空闲 5 分钟观察 | 无持续无意义动画/轮询；结果报告实际采样工具与环境 |
| PERF-02 | 低端设备与高刷新率 | 报告帧时间分布和几何调用数，不只写“感觉流畅” |

### 14.4 固定测试文案

测试数据不使用真实个人消息。至少包含：

- 中文标题：`项目演示最终修改意见与下一阶段交付时间确认`
- 中文正文：`请确认长文本在放大文字后仍然可以阅读，关闭按钮、主要操作和计时数字不能被截断或覆盖。`
- 无空格英文：`VeryLongUnbrokenDownloadFilename_QuarterlyReview_Final_Final_v12_2026-10-01.zip`
- 中英混排：`下载 Windows 桌面演示素材 1.25 GB / 2.50 GB`
- 时间：`00:01`、`59:59`、`1:00:00`、`99:59:59`
- 百分比：`0%`、`9%`、`99%`、`100%`、总量未知
- 元数据：`刚刚`、`2 分钟前`、`2m ago`、长度更大的本地化相对时间
- RTL：阿拉伯语或希伯来语正文，嵌入 `12:34`、`50%` 和英文文件名；由熟悉该语言的人确认顺序
- 图形：emoji、组合字符、生僻中文、缺失封面、透明封面和超宽封面

### 14.5 发布阻断条件

以下任一项出现，视觉实现不能验收：透明区吞桌面点击；通知抢焦点；无法键盘收起；放大文字后主操作消失；隐私模式读屏仍读出私密正文；窗口原生几何逐帧震荡；减少动态效果仍强制回弹；将未经验证的性能或“Apple 精确复刻”写为已完成。

## 15 给 Coding Agent 的执行顺序

1. **建立 contract**：从第 4 章解析 JSON，生成类型与 token；为单位转换、轮廓和活动 reducer 写测试
2. **先验证原生可行性**：只画一个静态黑色形状，检查耳角外、阴影和透明包围框的跨应用点击；确认焦点策略及多 DPI。未通过前不堆动画
3. **实现静态布局**：四类模板，默认、长文本、200%/225% 文字与 RTL。先让所有内容可达，再加装饰
4. **实现状态机**：按事件矩阵完成显式展开、预览、队列、打扰与取消规则；分清隐藏 UI 和结束业务
5. **加入无障碍语义**：键盘、焦点、名称、读屏状态公告、forced colors；测试原生窗口与 WebView 之间的实际行为
6. **加入视觉动效**：单一 transition owner、稳定 envelope、最终布局画布、可中断 timeline；禁止每帧原生 resize
7. **接入真实活动来源**：权限、revision、过期、错误、动作回滚与脱敏日志，禁止样例数据误标真实状态
8. **执行完整矩阵**：保存环境、录屏/截图、测试结果、未覆盖项和性能数据；所有发布阻断清零才算完成

交付代码时同时给出：token 生成方式、ShapeModel、事件 reducer 测试、四模板截图、15 个缩放组合结果、跨应用点击演示、读屏与键盘记录、性能采样说明。没有仓库或真实运行环境时，只能交付设计/实现建议，不能生成伪造的测试通过结论。

### 15.1 可直接复制给实现 Agent 的任务约束

> 依照本规范实现 Windows 桌面顶部刘海。以第 4 章 JSON 为唯一数值源。先验证原生透明区跨应用点击穿透、焦点和 DPI，再实现布局与动效。默认 hover 不自动展开，显式展开不会因 pointer leave 关闭。不要每帧 resize HWND、改 HRGN 或发窗口几何 IPC；不要用整体缩放拉伸文字。所有尺寸和时间均为本产品提案，不是 Apple 官方参数。完成后按第 14 章逐项给出真实通过、失败和未测试结果。遇到平台不能保证的能力，明确报告并使用可见且可操作的降级界面。

## 16 需要产品或工程确认的事项

以下项目属于落地前决策，不阻止使用静态 UI 基线，但不能由 Agent 悄悄假定：

1. 最低 Windows、Tauri 2、WebView2 与 GSAP 版本，以及真实透明区命中路线
2. 来源接入范围和权限：媒体、通知、计时和下载是否均有可靠数据源
3. 是否默认允许临时通知预览；本规范允许关闭且默认不抢焦点
4. 快捷键、用户选择显示器、全屏白名单和隐私快捷开关的产品入口
5. 是否支持触摸模式和行内回复；如未实现，明确给出主应用入口
6. 系统文字缩放与减少动态效果是否需要原生桥接，以及桥接后的测试证据
7. 显示器顶部被系统区域占用时，接受工作区锚点或改用普通悬浮窗口
8. V1 是否完全采用不透明材质；本规范默认是，模糊需另行立项验证

## 17 来源登记表

以下来源以官方文档、规范及框架维护者资料为主。研究日期不意味着已检验每个未来版本；实现应固定依赖版本并复核适用范围。参考稿只作为设计输入。

| ID | 官方来源或参考 | 本规范使用范围 |
| --- | --- | --- |
| A1 | [Apple HIG Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities) | 信息密度、字重、同心关系、iOS 尺寸参考与隐私原则；不作为 Windows 数值背书 |
| A2 | [ActivityKit Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities) | 呈现状态与系统交互；结合 [DynamicIslandExpandedRegionPosition](https://developer.apple.com/documentation/widgetkit/dynamicislandexpandedregionposition) 理解语义区域 |
| A3 | [SwiftUI Animation spring response dampingFraction blendDuration](https://developer.apple.com/documentation/SwiftUI/Animation/spring%28response%3AdampingFraction%3AblendDuration%3A%29) | 弹簧参数语义与替换行为，不含 GSAP 的精确映射 |
| A4 | [ActivityKit Creating custom views for Live Activities](https://developer.apple.com/documentation/activitykit/creating-custom-views-for-live-activities) | 原生 Dynamic Island 黑底和内容配置能力的范围 |
| A5 | [WWDC23 Design dynamic Live Activities](https://developer.apple.com/videos/play/wwdc2023/10194/) | 可扫读内容、图形及与边缘关系的设计讲解 |
| A6 | [Apple Fonts](https://developer.apple.com/fonts/) 与 [Fonts 技术说明](https://developer.apple.com/documentation/technologyoverviews/fonts) | Apple 字体用途与随资源许可；不授权跨平台随意分发 |
| A7 | [Apple Xcode and Apple SDKs Agreement](https://www.apple.com/legal/sla/docs/xcode.pdf) | System-Provided Images 许可标题相关限制；版本可能改变节号 |
| A8 | [Adding accessible descriptions to widgets and Live Activities](https://developer.apple.com/documentation/activitykit/adding-accessible-descriptions-to-widgets-and-live-activities) | Apple 展示内容的无障碍标签方向；Windows 仍需本地测试 |
| A9 | [Animating data updates in widgets and Live Activities](https://developer.apple.com/documentation/widgetkit/animating-data-updates-in-widgets-and-live-activities) | 系统管理的数据更新动画与平台限制，不推导桌面时序 |
| W1 | [W3C WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 正常文字 4.5:1；本项目对具体颜色另做计算 |
| W2 | [Microsoft Text scaling](https://learn.microsoft.com/en-us/windows/apps/develop/input/text-scaling) | 文字缩放与显示 DPI 不同；自定义框架支持与 225% 测试 |
| W3 | [CSS Filter Effects Level 2](https://drafts.csswg.org/filter-effects-2/) | backdrop-filter 合成范围及不透明覆盖层的影响 |
| W4 | [Tauri Window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) | 原生窗口能力与平台限制，需按锁定版本核验材质 |
| W5 | [Microsoft WM_DPICHANGED](https://learn.microsoft.com/en-us/windows/win32/hidpi/wm-dpichanged) | DPI 变更、建议窗口矩形，不能代替应用布局适配 |
| W6 | [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | 键盘、按钮和模态等语义模式；与 [Microsoft Accessibility](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility) 一起用于桌面验证 |
| W7 | [WAI-ARIA status role](https://www.w3.org/TR/wai-aria-1.2/#status) | 非打断状态公告；不支持每秒强制读出计时值 |
| W8 | [WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | 24 CSS px 的 AA 基线及例外；本项目 32/44 DIP 为另定标准 |
| W9 | [WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 必要控件/图形与相邻颜色的 3:1 基线 |
| W10 | [Microsoft WM_NCHITTEST](https://learn.microsoft.com/en-us/windows/win32/inputdev/wm-nchittest) | 原生命中值的语义；HTTRANSPARENT 的同线程范围不得推断为任意跨进程穿透 |
| W11 | [Microsoft WebView2 Threading model](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/threading-model) | STA UI 线程、消息泵与异步回调限制 |
| W12 | [WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | 普通动作按钮与稳定名称 toggle button 的区别 |
| W13 | [Microsoft SetWindowRgn](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowrgn) | 绘制区域、窗口相对坐标及成功后的 region 所有权 |
| W14 | [Microsoft Window Features](https://learn.microsoft.com/en-us/windows/win32/winmsg/window-features) | Layered Windows 的平台命中条件，不推导 CSS 等价关系 |
| T2 | [Tauri 2 Capabilities](https://v2.tauri.app/security/capabilities/) | 权限边界和最小作用域 |
| T3 | [Tauri Calling the frontend](https://v2.tauri.app/develop/calling-frontend/) | 事件订阅和解除生命周期 |
| R1 | [React StrictMode](https://react.dev/reference/react/StrictMode) | 开发期额外 setup/cleanup 检查，不保证 effect 只执行一次 |
| T1 | [Tauri 2 DPI API](https://v2.tauri.app/reference/javascript/api/namespacedpi/) 与 [Tauri Window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/) | Physical/Logical 转换和窗口级操作；整窗 ignore cursor 不等于逐像素命中 |
| G1 | [GSAP Eases](https://gsap.com/docs/v3/Eases/) 与 [官方 gsap-core 源码](https://github.com/greensock/GSAP/blob/master/src/gsap-core.js) | easing 类型、elastic 振幅/周期；源码默认分支会变，实际实现应固定版本 |
| G2 | [GSAP quickTo](https://gsap.com/docs/v3/GSAP/gsap.quickTo()/) | 从当前补间值重定向不等于物理速度继承 |
| G3 | [GSAP React](https://gsap.com/resources/React/) 与 [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | React 生命周期、上下文清理和偏好变化处理 |
| U1 | [用户提供的设计参考稿](https://docs.google.com/document/d/1sdlX7qsjrMUbUtYwFDZREgJ4c3fU6ZPP84BysD6HZjw/edit) | Windows 贴顶造型与初始时序输入；不是外部权威 |

本规范没有复制 Apple 资源包或图标，也没有把官方文档的内容直接当作可在 Windows 上运行的代码。所有本产品设计决定与示例均应以真实实现反馈迭代。

## 18 文档自检记录

- 已把 Apple 设计建议、Apple API、Windows/Web 工程事实和本产品提案分开
- 已将尺寸、颜色、字号、动效、行为和性能预算收敛为一份 JSON
- 已给出可复算的宽高预算、状态事件矩阵、四类内容模板和原生输入边界契约
- 已列出系统 DPI 与文字缩放的独立测试矩阵、键盘/读屏/隐私与降级要求
- 尚未对本项目现有代码、目标 Windows 设备或真实屏幕执行实现验收；所有性能值均为待验证目标
