# 检验报告阅读场景设计复核记录

日期：2026-10-09。范围：Windows UI/UX v1既有临床岛内的检验报告阅读场景普通扩展，code-led，Read模式。用户原始规范、两份检验场景附件及全局视觉体系文件不在本次文档写入范围。

## 最终处分及其范围

finish reviewer的Verdict Pass处分为 **ship**，四项指定修复均为 **resolved**。该评分只回答四项修复是否落实，不能推导为“没有其余问题”、全软件通过、原生屏幕连续性通过、生产/临床就绪或正式验收。实机随后发现的来源回复跨WebView残留和捕获保护局限不属于这四项评分，其修复与验证另行记录。本文为documenter核对和记录，不替代reviewer另行作全表面复核。

| 修复项 | 最终评分 | 核对到的实现与本轮证据 |
| --- | --- | --- |
| 预览容纳阅读器 | resolved | `ClinicalStudio.tsx`在报告场景活动时将预览高设为660px；正常文字的最高580px阅读器处于预览内。`reader.png`与`reader-225.png`由本轮报告回归捕获，最后12项均通过，225%底部操作的边界另由测试断言检查 |
| forced-colors范围条与倒计时环 | resolved | `reader.css`用GrayText绘制范围轨道/底环，CanvasText绘制参考区间/前景环，相关图形保留系统色；`reader-forced-colors.png`可见区间与轨道分离。测试同时检查二者计算色不同及操作按钮焦点 |
| 225%倒计时同步放大 | resolved | 文字`11px × 2.25 = 24.75px`，环`36px × 2.25 = 81px`；最后11项回归直接检查计算字号24.75px，`reader-225.png`显示数字与环同步放大 |
| 摘要偏低芯片对比度 | resolved | 芯片文字局部覆盖为`#409cff`。对14%白色叠加黑底的实际底色按WCAG相对亮度公式计算为约5.50:1，`summary.png`与当前CSS一致。此处只记录摘要芯片，不泛化为所有蓝色元素对比度已验收 |

## 普通扩展与既有体系的比较

方向契约保留在`docs/LAB-READER-IMPLEMENTATION.md`。既有Windows UI/UX v1的黑色不透明主体、外耳与连续曲率轮廓、系统字体栈、等宽数字、有限数值弹簧、单一SVG动画所有者、稳定原生画布和有序轮廓交接继续作为场景基础。场景增加通知→摘要→阅读→本地清除的层级，读取正文保持只读，完整来源报告复用身份/版本校验入口。

场景局部适配为372×200摘要、400×最高580阅读器、210×36完成提示，以及60秒阅读预算、8秒遮罩、1100ms烧蚀与1700ms完成时长。尺寸在小可用区域内优先保证可见，200%/225%实际放大字体并允许摘要增宽/增高；这些数值不改写其他临床场景。场景tokens由附件适配器生成；色彩与组件样式当前仍由`reader.css`定义。

未创建或重写全局`DESIGN.md`及`.impeccable/design.json`。现有代码与不可变Windows规范本身提供已建立的视觉权威；文件名缺失不构成重设视觉世界的理由。历史`UIUX-V1-IMPLEMENTATION.md`中的2026-10-06验收与未完成项属于当时基线，本轮不靠旧叙述宣布新功能通过，也不在documenter范围内改写历史结果。

## 文档核对依据

| 类别 | 本次检查的材料 |
| --- | --- |
| 设计权威 | `docs/Windows 灵动岛 UI UX 设计规范 v1.0.md`的几何、色彩、排版、阴影、弹簧、无障碍与第12节token；两份`docs/protype`检验场景输入；现有实施记录 |
| 场景实现 | `src/clinical/lab-reader/tokens.json`、`reader.css`、`model.ts`、`geometry.ts`、`LabScene.tsx`、`useLabReader.ts` |
| 接入与原生边界 | `ClinicalIsland.tsx`、`ClinicalStudio.tsx`、`controller.ts`、`useClinicalLayout.ts`、`useButtonFeedback.ts`、`bridge.ts`、`clinical_window.rs`、`reader_native.rs`、`reader_profile.rs`、Rust消息关联及模拟来源读取边界 |
| 验证 | `tests/lab-reader.test.ts`、`tests/lab-reader.spec.ts`、`tests/clinical-continuation.spec.ts`、`tests/native-bridge.test.ts`、`tests/evidence-path.ts`；本轮单元/E2E JSON、失败trace及RED、两轮源码快照、Release日志、正常启动/来源隔离/原生studio焦点/目录清理JSON、`RESULTS.json`、`FINAL-HASHES.json`及本轮截图 |

输入哈希已现场核对：Windows规范`a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa`，检验Markdown`beca7ca59cce18f7898f97caf497a9f63e8e30b55a91fd74e1cb2bb2d74c9aff`，检验HTML`625664a43eea9ceb14763ef27e650a1f8d8766ded933e8d6704a451416146dad`，与本轮baseline及场景tokens记录一致。

本次纠正了实施文档的解析限制描述：源码限制`JSON.stringify(report).length`为65536个JavaScript UTF-16码元，结果与参考值要求finite/null、年龄要求0–130的整数；不能写成按字节限制64KiB或结果另有幅值界限。文档也明确实时减弱动效同步、预览区660px与原生画布策略的区别，以及局部蓝色覆盖。

## 证据状态与保全限制

最终汇总`RESULTS.json`状态为`IMPLEMENTED_WITH_BOUNDED_VALIDATION`。`unit-final-focus.json`为191/191，Rust7/7且之后Rust源码未变，`release-final-focus.log`记录最后Release成功，`e2e-scene-final.json`为最后12/12。此前受影响集合18/18包含7项旧交互与11项报告。焦点改动后的完整72项未重跑，不宣称最终全量PASS；构建、单元测试和这些受影响集合的通过不被拼成一次完整回归。

早期190项单元测试、35项针对性回归、目录修复后15项及该次报告11项通过记录保留。一次全量70项为68通过、2项ENOENT；监听修复前`e2e-complete.json`完整71项通过，后续`e2e-routing-final.json`完整70/71、唯一按钮回弹失败；F328轮`unit-delivery-final.json`191/191和`release-delivery.log`成功也保留。早期通过、失败与RED均按原版本/轮次记录，不改写为最后完整72项通过。documenter只更新本记录及实施文档，不写最终汇总。

最新完整失败trace明确记录`pageError: Invalid spring input`，来自`useButtonFeedback`的rAF时间戳减`performance.now()`出现负时间差。`e2e-press-red.json`及`press-negative-time-red/`保留真实浏览器rAF回调减50ms的确定性RED。前向修复按既有布局方式将dt钳制为`Math.max(0,dt)`，不更改产品弹簧参数或时间；旧按钮回归继续带该时间偏移，最终能回弹释放且页面无异常。

`e2e-affected-final.json`记录16/18，另外两项是QA同步竞态：颈部700ms采样可能先于HTTP事件到达结束，虚拟时钟继续运行可能跨过burn。测试现先确认颈部采样器安装、从首次真实true再观察700ms并以5秒封顶；两项到期测试先`clock.pauseAt`再精确推进。产品时长不变。`e2e-affected-delivery.json`受影响18/18通过，包含7项旧交互和11项报告；它发生在最后焦点改动前，不能替代最后完整72项回归。各失败和RED不覆盖。

受跟踪历史证据的本轮改写结果已归档至`regression-generated`并从HEAD恢复。`evidence/uiux-continuation-20261008`中未跟踪的三张`accessibility-text-1/2/2.25.png`确已被更新且无原字节备份；不能宣称历史证据完全未变。之后旧回归使用`ISLAND_E2E_EVIDENCE_DIR`输出到本轮目录。

`normal-launch.json`记录首次Release EXE（SHA256 `38368deb85e26ffc40555cb04d44ae514288c2a3474f65dd60de369d92c7629f`）无QA参数正常启动且9223关闭。`native-platform-status.json`显示Windows通知状态BUSY=2，普通报告岛被既有避让规则隐藏；因此原生岛阅读、开合和真实穿透不能判通过。首轮`native-source.json`记录来源对象DEMO-S04匹配、8项及亲和性17，但捕获工具仍返回可读虚构内容，旧证据保留。`native-webview-runtime.json`确认已观察到的WebView2后代使用应用自有会话配置、版本154.0.4258.62且无QA参数。

全局Tauri `listen`的Any目标造成来源回复进入studio并留下报告副本，已改为`getCurrentWebviewWindow().listen`。`native-source-isolation-final.json`对应PID22732/已验EXE `f3287e12162366defb60e65eed14abfb6a24a781d2962d857c23ec2224378fa2`：来源DEMO-S04/v1、8行、InPrivate，studio在来源打开时0行/无来源对话框，主验证流程另观察关闭后同样0行/无对话框。该轮来源隔离复验通过，主岛完整A12因BUSY隐藏仍未运行。F328只代表这轮实机证据，其后已新增焦点修复，不是最终交付EXE。

该轮来源亲和性仍为17，修复后Sky抓屏仅显示底层studio普通元数据，不返回完整报告正文。首轮可读图像可能来自底层studio副本，这只是推断；旧抓屏/残留证据不覆盖。结论限定为单一Windows11/WebView2 154捕获客户端的观察，不支持绝对防截图。

`profile-cleanup.json`记录故意终止自有进程并重启后，旧PID14040/14712的两会话目录已移除，仅保留新PID22732自有目录。这证明异常退出后的下次启动清理，正常退出清理仍NOT_RUN，不支持“从不落盘”。`native-source-final.json`在96 DPI记录102个被动样本，实际计量耗时11.748秒；主岛静态且BUSY隐藏、窗口变化0，不能算报告开合。含studio/source的应用/WebView2全树私有工作集270.2MiB、私有提交400.29MiB、短采样机器CPU百分比0，不是Rust进程单独内存，也不证明设备性能全部通过。

`unit-native-routing.json`首轮191项中190通过、1失败是新增测试的ABI mock缺少transformCallback，开发失败保留。补齐后的`unit-routing-final.json`为191/191、23套件全部通过；`native-bridge.test.ts`直接使用已安装Tauri JS API并模拟其底层IPC事件目标，验证定向来源回复不进入studio及监听注销。路由单元回归及上述F328版本来源隔离已验证，但不推导主岛完整A12或最后EXE验收。

F328版本studio预览还发现解锁移除按钮使焦点落body，Esc不能清除，失败记录为`native-preview-esc-before-fix.json`。`LabScene`现仅在呈现stage与实际lab.stage都为read、报告存在且未遮罩时聚焦滚动区，使用preventScroll；alert/sum/burn/done或旧呈现层不触发，没有全局Esc或通知自动聚焦。`e2e-focus-final.json`专测1/1和`e2e-scene-final.json`最后12/12通过。

最后交付EXE SHA256为`be01bd96c7a862b35ab3adab8ce3a09c7fe14765d6b8a95078dabcf807df42f4`。`normal-launch-final.json`记录PID30060正常`--studio`启动、9223关闭，当前仅有`session-30060-1791532286470888300`配置目录。`native-preview-focus-final.json`记录最后EXE的原生studio预览实际read、遮罩移除结果行、Esc进入burn且控件禁用、完成后0报告行且阅读器控件消失；没有来源删除或临床写入。主岛仍受BUSY=2避让，这次studio结果不能冒充主岛原生阅读/开合/穿透或完整A12验收。

路由/按压修复时快照`tested-code-delivery-hashes.json`保留。documenter现场重算最后`tested-code-final-focus-hashes.json`的141项源码，零漂移；EXE SHA256与`FINAL-HASHES.json`一致，三份输入不变。当前分支main、HEAD `9609ecf8dc2912ffd6595053f1bb442af449dbbc`，未提交、推送或发布。文档写入只涉及分配的两份文件，没有修改源码。

来源隔离、抓屏和270.2MiB计量均为F328轮证据；最后改动集中于LabScene焦点，Rust捕获/私有路由、bridge及来源主组件不受该改动影响，但不把先前实机计量改写成BE01重新测量。BE01正常启动与原生studio焦点/Esc清除已有独立证据。主岛原生屏幕连续性/穿透、正常退出清理、GPU、Windows10、物理DPI/混合多屏、120Hz/DWM、讲述人、真实触屏均保持NOT_RUN；96 DPI仅为被动观察。四项设计评分不扩展为这些设备验收。

## 截图来源

`summary.png`、`reader.png`、`reader-225.png`、`reader-forced-colors.png`由本轮`lab-reader.spec.ts`捕获运行在隔离Chrome测试配置中的模拟页面，2026-10-09阅读场景及受影响集合回归重新生成。它们是证据截图，含虚构夹具，不是AI生成图片、用户数据或随应用交付的位图资产。本轮没有位图素材生成或素材来源替换。
