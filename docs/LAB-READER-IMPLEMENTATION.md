# 检验报告阅读场景实施记录

## Direction contract

THESIS: 在现有原生岛中渐进阅读一份虚构报告，通知、摘要、阅读和本地清理保持同体；只有完整报告进入模拟来源窗口。

OWN-WORLD: 继承 Windows UI/UX v1 黑色不透明外壳、连续曲率外耳、数值弹簧和独立原生阴影；结果红/蓝、倒计时橙、会话提示绿。系统字体、等宽数字，无水印。

STORY: 用户收到报告，查看摘要，阅读来源结果，选择打开完整报告或清除本次岛内快览。清除不代表源报告删除或任何临床确认。

FIRST VIEWPORT: 124×32 静默主体，372×88 通知；372×200 摘要中主操作右置；400×最高580阅读器保留固定头尾和滚动结果。输入只在真实轮廓内。

FORM: 用户已批准的附件布局与实施计划，code-led；无随机概念轮换。状态 idle/alert/sum/read/burn/done，隐私遮罩为 read 附加状态。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

本轮属于既有临床岛内的普通场景扩展，模式为 Read。上述方向契约沿用现有 Windows UI/UX v1 视觉权威；本记录承担场景文档职责，不创建或改写全局 `DESIGN.md`、`.impeccable/design.json`。本轮没有新增随应用交付的位图资产，证据 PNG 是模拟页面的测试截图。

## 范围与入口

本模块仅接受带 labRef 的 S04 模拟报告，普通 S04、S03危急值及其余来源仍走原有界面。试验台的“重播：收到检验报告”、全部正常夹具、定性与缺失值夹具是演示入口。重播延迟520ms，普通启动不自动播报。

用户原始 UI/UX 规范、检验场景开发文档和HTML均不可修改。场景 tokens 单独生成并记录两份附件 SHA256，不覆盖通用 tokens。水印节点、SVG、水印文字和“已加水印”均不加入。

## 数据和源系统边界

Activity只含通知元数据及报告引用；正文通过 clinical:lab-read 按身份、报告id、版本和权限取得。最多128个项目，`JSON.stringify(report).length` 上限65536（JavaScript UTF-16码元）；这是序列化字符串长度限制，不是按字节计算的64KiB限制。身份与报告文字字段有长度限制，项目id不得重复，结果/参考值必须是有限数或null，未另设其幅值上限；年龄要求0–130的整数，只复制已知字段。展示异常旗标由来源提供，前端不推导临床优先级。夹具生成器里的范围比较只用于虚构数据。

设计目标是报告内容只保留于当前阅读会话。Native一条Rust WebSocket不变，Rust侧lab-report/source/route回复按请求关联定向给发起窗口，过期/未知关联丢弃。实机随后发现前端全局Tauri `listen`使用Any目标，仍会收到定向给其他窗口的来源回复，造成studio取得报告副本并残留。`src/lib/bridge.ts`已改为`getCurrentWebviewWindow().listen`，新增单元路由回归和一轮来源实机隔离复验均通过：来源有8项，studio在来源打开/关闭后均无报告行或来源对话框。该轮EXE为F328版本，随后又有焦点修复，不能把它当作最终交付EXE；原生岛的完整A12仍未运行。完整报告复用原来的来源ticket与版本校验，不增加临床写入、删除、打印或剪贴板操作。

本地焚毁不提供四秒撤销。来源仍可显式重新校验打开。本原型不是可靠送达或正式身份认证。

## 时间与隐私

60秒剩余预算使用实际时间；100ms只刷新显示。鼠标悬停暂停，触屏不暂停。8秒无操作、窗口失焦或进入后台遮罩；遮罩删除患者元信息和结果DOM及无障碍内容，保留当前内存会话用于显式解锁。移动不解锁，点击/键盘激活解锁。遮罩期间恢复计时。

手动/ESC/正常到期烧蚀1100ms，随后移除报告引用与阅读DOM、停止时钟，完成提示1700ms。减弱动效≤50ms。权限/版本失效立即清理，不等待装饰动画。已遮罩内容焚毁时不重新露出结果。锁定/来源失效可以覆盖“焚毁不响应普通输入”的规则。

Native有限时钟给普通100ms UI tick留150ms余量；renderer未及时响应就隐藏窗口并发到期事件，前端恢复时清理。它不是空闲轮询或永久渲染循环。当前减弱动效值通过ref同步给自动到期路径，因此在阅读中改变设置后不继续使用进入阅读时的旧值。

实机studio预览发现显式解锁移除遮罩按钮后焦点落到body，Esc不能清除。当前`LabScene`仅在呈现层与实际场景同时为read、报告存在且未遮罩时，用`focus({preventScroll:true})`把焦点留在报告滚动区；alert/sum/burn/done及旧呈现层不会触发，不新增全局Esc，也不让通知自动获得焦点。新增焦点专测1项及最后12项阅读回归通过；最后BE01版本EXE在原生studio预览中验证实际阅读、遮罩后Esc进入burn且两个操作禁用，完成后0报告行、阅读器控件消失。主岛仍因BUSY=2隐藏，此结果不能代替主岛原生验收。

## 原生与已接受差异

- 稳定画布覆盖580高阅读器及过冲/抗锯齿余量；正常开合不改HWND大小位置，输入继续用共享SVG多边形与有序HRGN交接。阴影不扩大输入区域。
- 采用现有连续曲率路径，不复制演示普通圆弧。宽、高、圆角独立弹簧保留速度，内容不缩放文字。
- sum岛外行为采用原有pointerup且不吞下层点击；ESC作用于显式获得焦点的岛，不注册裸全局ESC。
- read/burn/done期间新活动排队，个人计时器截止时间不变。完成后释放场景并展示待看的来源活动；当前报告版本更新和权限撤销例外处理。
- 100%文字尺寸按附件；200%/225%实际字体放大，允许摘要增高/增宽。倒计时文字为`11px × textScale`，环的宽高为`36px × textScale`，225%分别为24.75px与81px。小屏可见安全区域优先于380最小高度。
- 小于640逻辑可用宽度、顶部任务栏或用户悬浮设置采用Float；原生指标来自显示器可用区域而非保留画布。
- 试验台在阅读场景活动期间把预览区增高到660px，容纳正常文字下最高580px的阅读器；其作用是页面预览布局，不是原生HWND尺寸策略。

## 视觉实现核对

场景几何与时序的唯一适配数据为`src/clinical/lab-reader/tokens.json`，由`npm run tokens:lab`生成；颜色、字号与组件样式目前定义在`reader.css`，不回写用户规范或通用临床tokens。两份检验场景附件的SHA256与当前文件一致：Markdown为`beca7ca59cce18f7898f97caf497a9f63e8e30b55a91fd74e1cb2bb2d74c9aff`，HTML为`625664a43eea9ceb14763ef27e650a1f8d8766ded933e8d6704a451416146dad`。Windows UI/UX v1原文SHA256保持`a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa`。

| 项目 | 当前实现与作用 |
| --- | --- |
| 外壳与形体 | 继承不透明黑色主体、10 DIP外耳、连续曲率路径、独立透明原生阴影；报告内容不增加全窗口模糊 |
| 几何 | 正常文字主体idle 124×32、alert 372×88、sum 372×200、read 400×380–580、done 210×36；Notch视觉外接宽度另外包含两侧外耳，Float不含外耳 |
| 弹簧 | 宽度与半径expand 190/22、collapse 260/28、morph 320/26；报告高度210/23。沿用有限数值积分、反向保留速度；GSAP仅承担有限内容呈现 |
| 排版 | 继承系统字体栈与等宽数字。报告标题17px、项目名14px、结果18px、正文/按钮13px、辅助信息和倒计时11px，均乘文字倍率；结果区滚动，头尾固定 |
| 间距与容器 | 摘要16×20px内边距；结果行12×14px、16px圆角、背景`#1C1C1E`；芯片14px圆角与14%白色填充；按钮16px圆角、最小32px高 |
| 场景颜色 | 偏高/异常`#FF453A`，偏低结果/圆点`#0A84FF`，倒计时预警`#FF9F0A`，会话提示`#30D158`。摘要偏低芯片单独使用`#409cff`，在14%白色叠黑底上计算对比度约5.50:1；此覆盖不改变通用蓝色token |
| 高对比度 | 使用系统Canvas/CanvasText、ButtonText与Highlight；范围轨道为GrayText，参考区间为CanvasText，倒计时底环为GrayText、前景环为CanvasText。对应元素保留系统色而不是依赖低透明度装饰 |
| 焦点与语义 | 按钮、滚动区具有名称和可见焦点；范围条为辅助视觉并设`aria-hidden`，数值、单位与参考范围仍为可读文字；倒计时名称给出剩余秒数。隐私遮罩移除患者元信息与项目DOM |

附件演示的普通圆弧、内容缩放、默认自动播报、鼠标位置轮询、裸全局ESC、水印和绝对“未留存”文案没有直接移植。当前采用已有连续曲率轮廓、文字不缩放的内容呈现、显式试验台重播、轮廓命中、已获焦点的ESC及“本次快览已清除”。这些取舍服从既有原型边界，不把演示建议升格为临床能力。

## 捕获与存储的能力边界

摘要/阅读/烧蚀调用并检查SetWindowDisplayAffinity，优先WDA_EXCLUDEFROMCAPTURE，失败降级WDA_MONITOR，均失败就不取得/展示报告。含同一报告的独立来源窗口也要求设置同一API。正文移除并经过绘制交接后才恢复。

首轮实机来源窗口读回亲和性17（`0x11`），捕获工具却返回可读虚构报告内容，旧证据保留。修复窗口监听后，F328版本同一捕获客户端的来源抓屏只返回底层studio普通元数据界面，不返回完整报告正文。首轮可读内容可能来自底层studio报告副本，这是推断而不是已证实的图像来源。当前只能记录显示亲和性API已应用及这一捕获路径的有限观察，不能宣称绝对防截图或推导所有Windows捕获方式相同。

应用使用自有临时WebView2目录并请求InPrivate，岛、试验台和来源采用相同环境参数。WebView2旧版本可能忽略InPrivate；临时目录仍为保底。正常退出等待短暂关闭后清理，锁定文件或异常退出可能留下目录，下次启动只重试应用自有目录。

`profile-cleanup.json`记录故意终止已验证自有进程并重启后，旧PID14040/14712的两个目录已移除，仅保留新PID22732自己的会话目录。这验证异常退出后的下次启动清理；正常退出清理仍为NOT_RUN，不支持“从不落盘”的表述。

不向localStorage/IndexedDB/日志/剪贴板写报告正文。临时目录不是“绝不落盘”，GC不是可证明的即时内存擦除，显示亲和性不是绝对防泄露。完成文案为“本次快览已清除”。

附件A12按“当前会话的可访问DOM/状态/回调及应用日志无残留”验收。F328版本来源打开/关闭后studio均无报告行，证明该轮来源隔离的有限范围；BE01最后EXE的原生studio预览清除后0报告行且阅读器控件消失。主岛因BUSY=2隐藏，原生岛完整阅读/清除的A12仍未运行；两种有限范围不合并为全进程内存擦除证明。夹具源文件、来源服务器和原始附件保留；不得将全进程字符串无命中、可靠临床交付或所有设备性能宣称PASS。

## 验证状态

本轮证据目录`evidence/lab-reader-20261009`，最终汇总为`RESULTS.json`，状态`IMPLEMENTED_WITH_BOUNDED_VALIDATION`。最后`unit-final-focus.json`191/191、Rust7/7、`release-final-focus.log`构建和`e2e-scene-final.json`12/12通过；此前受影响集合18/18包括7项旧交互与11项报告。早期完整71项通过属于监听修复前版本，后续完整为70/71、按压失败已修复并复验；最后焦点变更后的完整72项未重跑，不能合成为最终全量PASS。全部早期失败与RED保留。

| 证据 | 已记录结果与解释 |
| --- | --- |
| `unit-delivery.json` | 190项TypeScript单元测试全部通过，22个测试套件；涵盖既有模块及报告解析、范围坐标、会话清理、时间预算和只读来源边界 |
| `unit-native-routing.json`、`unit-routing-final.json` | 新增路由回归首轮191项中190通过、1失败，原因是测试ABI mock缺少transformCallback，开发失败记录保留。补齐后最终191项、23个套件全部通过；测试调用实际已安装Tauri JS API并模拟其IPC事件目标，不能替代实机复验 |
| `unit-delivery-final.json`、`release-delivery.log` | 191/191单元测试及F328轮Release构建通过；这轮尚未包含显式阅读焦点修复，最后结果由下一行记录 |
| `unit-final-focus.json`、`release-final-focus.log` | 显式阅读焦点修复后的最后191项单元测试与Release构建通过；对应最终BE01版本EXE |
| Rust库测试 | 主验证流程记录7项通过；这属于Rust测试结果，不是原生屏幕或设备矩阵验收 |
| `e2e-targeted.json` | 35项针对性旧临床与新场景回归通过，无跳过、意外失败或flaky |
| `e2e-final.json` | 该次全量70项记录为68通过、2失败。两项都是click-transition写出证据子目录时的ENOENT，失败记录保留，不将该次全量写成70项通过 |
| `e2e-delivery-recheck.json` | 修复证据目录创建后，click-transition与报告场景合计15项通过；这是受影响集合的重跑 |
| `e2e-reader-delivery.json` | 该次11项报告场景回归通过，包含阅读期间实时改变减弱动效后的自动清除；无跳过、意外失败或flaky |
| `e2e-complete.json` | 监听修复前的全量71项全部通过，无跳过、意外失败或flaky。它是独立新一轮全量结果，不改写早期70项的失败记录 |
| `e2e-routing-final.json`、`routing-full-button-release-failure/` | 监听修复后的完整71项为70通过、1失败：按钮按压回弹未释放，trace记录`Invalid spring input`。该产品缺陷记录保留，不因后续受影响集合通过而改为完整71项通过 |
| `e2e-press-red.json`、`press-negative-time-red/` | 浏览器真实rAF回调减50ms的确定性RED，0通过、1失败，复现负时间差进入按压弹簧。此记录保留为RED |
| `e2e-affected-final.json` | 修复按压后受影响18项中16通过、2失败，分别是颈部700ms采样早于HTTP事件抵达而结束，以及虚拟时钟仍运行导致错过burn的QA竞态；失败保留 |
| `e2e-affected-delivery.json` | 调整QA同步后受影响18项全部通过，包含7项旧交互与11项报告场景；这属于最终焦点改动之前的受影响集合重跑，不能替代最后72项全量回归 |
| `native-preview-esc-before-fix.json`、`e2e-focus-final.json`、`e2e-scene-final.json` | F328版本实机studio预览解锁后Esc无效的失败记录保留；实际read时焦点进入有效滚动区的专测1/1通过，最后12项报告场景全通过，无跳过、意外失败或flaky |
| 首次Release构建与`normal-launch.json` | 主验证流程记录首次构建通过，正常启动未带QA参数、9223关闭；该次EXE SHA256为`38368deb85e26ffc40555cb04d44ae514288c2a3474f65dd60de369d92c7629f`，不能替代监听修复后重建与启动复核 |
| `native-platform-status.json` | Windows通知状态BUSY=2、查询HRESULT=0；普通报告岛被既有避让规则隐藏。原生阅读/开合/真实穿透在此条件下不能判通过 |
| `native-source.json` | 模拟来源对象匹配DEMO-S04、8项。来源捕获亲和性读回17，但工具仍捕获可读虚构内容，实际防截图未通过 |
| `native-source-isolation-final.json` | 对应PID22732/EXE SHA256 `f3287e12162366defb60e65eed14abfb6a24a781d2962d857c23ec2224378fa2`的该轮来源实机隔离：DEMO-S04/v1、8行、InPrivate，studio在来源打开/关闭后0行且无来源对话框；后者关闭观察由主验证流程提供。亲和性17，抓屏只显示底层studio普通元数据，不返回完整报告正文。该EXE不是焦点修复后的最终交付EXE |
| `native-source-final.json` | 该轮96 DPI下102个被动样本、记录耗时11.748秒；主岛处于BUSY隐藏，窗口变化0仅是静态隐藏窗口观察，不算报告开合。含studio与source的应用/WebView2全树私有工作集270.2MiB、私有提交400.29MiB，短采样机器CPU百分比0；不能据此宣布性能目标全部通过 |
| `profile-cleanup.json` | 故意终止自有进程后再启动，旧PID14040/14712会话目录移除，仅有新PID22732自有目录；正常退出清理NOT_RUN |
| `native-webview-runtime.json` | 已发现的WebView2后代版本154.0.4258.62，均使用应用自有会话配置目录且没有QA参数；主验证流程另观察到来源WebView为InPrivate。它不证明临时目录绝不落盘 |
| `normal-launch-final.json`、`native-preview-focus-final.json` | 最后EXE SHA256为`be01bd96c7a862b35ab3adab8ce3a09c7fe14765d6b8a95078dabcf807df42f4`，PID30060正常`--studio`启动且9223关闭，仅有`session-30060-1791532286470888300`会话目录。原生studio预览的read/reveal焦点与Esc清除复验通过，完成后0报告行、无阅读器控件；主岛仍因BUSY隐藏，未验收 |
| `FINAL-HASHES.json`、`tested-code-final-focus-hashes.json` | 最后源码141项SHA256零漂移，三份不可变输入不变；documenter现场重算141项及EXE哈希一致。分支main、HEAD `9609ecf8dc2912ffd6595053f1bb442af449dbbc`；未提交、推送或发布 |
| `summary.png`、`reader.png`、`reader-225.png`、`reader-forced-colors.png` | 本轮模拟页面截图。225%检查实际项目名字号31.5px、倒计时24.75px、滚动区溢出与底部操作可达；forced-colors检查轨道和参考区间的计算色不同 |
| `DESIGN-REVIEW.md` | finish reviewer的四项修复全部resolved；处分`ship`只针对这四项修复的Verdict Pass，不是全软件、原生或正式验收 |

开发过程失败保留在本轮JSON中，不用后续通过覆盖或改名为通过。BUSY隐藏期间不把主岛原生阅读、开合或穿透记为通过；旧抓屏内容与studio副本残留失败也不被后续有限观察或四项设计评分抹去。来源隔离、单一路径抓屏和270.2MiB计量属于F328版本；最后LabScene焦点改动不改变Rust捕获/私有路由、bridge和来源主组件，该轮证据仍明示版本范围，不能标成BE01重新测量。BE01的正常启动及原生studio预览焦点/Esc清除已复验；设备/DWM、讲述人、真实触屏、Windows10、物理DPI与混合多屏仍分别保持未运行状态。浏览器rAF仅代表回调节奏，不能保证DWM呈现帧。正常启动不使用`--qa-cdp`，BE01最后正常启动已记录9223关闭。此次未提交、推送或发布。

按压缺陷的前向修复仅将`useButtonFeedback`的`(rAF timestamp − performance.now()) / 1000`时间差钳制到非负，沿用`useClinicalLayout`已有方式；不改变弹簧参数、文字大小或产品时长。旧交互回归安装真实rAF回调的−50ms偏移并检查按压回弹解除、页面无异常，最终受影响回归通过。颈部测试在HTTP前确认采样器已安装，从首次真实`data-neck=true`继续700ms，总采样上限5秒；两项到期测试先`clock.pauseAt`再精确推进，保留60秒阅读、1100ms烧蚀及50ms减弱动效的产品时间。

路由/按压修复时快照`tested-code-delivery-hashes.json`保留；焦点修复后最终源码快照为`tested-code-final-focus-hashes.json`，141项重算零漂移。`FINAL-HASHES.json`记录最终BE01 EXE与三份不可变输入，documenter重算EXE哈希匹配。F328作为前一轮实机证据版本保留，不沿用为最终交付哈希。

附件第14节的量化检查按下表对应，避免把浏览器和源码证据升格为实机全部验收：

| 附件检查 | 当前对应与验证边界 |
| --- | --- |
| A1、A13 尺寸/停靠 | 场景几何单测和浏览器正常文字尺寸断言；小屏安全区优先。真实物理坐标/DPI及顶部任务栏仍需单独原生记录 |
| A2–A5 弹簧/反向/内容时序 | 复用既有数值弹簧与SVG单所有者，内容由有限GSAP呈现；本轮浏览器/旧场景回归不等价于附件中全部原生曲线、偏移和实际屏幕连续性采样 |
| A6 范围坐标 | 报告单测逐项检查夹具圆点坐标与CRP区间；定性、缺失、单侧、相等/逆向区间不画无效范围条 |
| A7–A10 时间/遮罩/清除/减少动态 | 时间预算单测与阅读浏览器回归覆盖暂停、长调度间隔、显式解锁、版本/权限变化、到期、ESC和实时减少动态；原生时钟及触屏暂停行为不由浏览器模拟直接验收 |
| A11 点击穿透 | 浏览器测试确认背景目标响应；真实下层HWND的点击投递、阴影区域与每DPI物理命中仍需原生验证 |
| A12 无残留 | 浏览器/单元测试检查受本阅读器拥有的快照与DOM清理、来源对象不被修改；F328来源隔离确认studio0行，BE01原生studio预览清除后0报告行/无阅读器控件。主岛原生完整A12仍未运行，源码、来源夹具、独立来源窗口和GC/OS复制不属于可保证即时擦除的范围 |

## 历史证据与输出目录

旧回归测试曾沿用历史输出路径。被本轮测试改写的受跟踪证据已归档到`evidence/lab-reader-20261009/regression-generated`，随后从HEAD恢复；该归档是本轮生成结果，不是历史原始证据。旧目录`evidence/uiux-continuation-20261008`里的三张未跟踪图片`accessibility-text-1.png`、`accessibility-text-2.png`、`accessibility-text-2.25.png`也被沿用路径更新，且没有原始字节备份，不能宣称全部历史证据未改变或可恢复。

后续旧回归输出通过`tests/evidence-path.ts`使用环境变量`ISLAND_E2E_EVIDENCE_DIR`重定向到本轮目录，并在写出前创建目录；报告专用截图直接写入本轮报告目录。最终判断使用本轮证据，不把旧目录中更新后的图片当成旧验收时的冻结捕获。
