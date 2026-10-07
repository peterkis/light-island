# 临床灵动岛：恢复 U 型与连续动效

## 本轮范围
从当前 main/fcf5990 的已有临床实现继续，不回滚 PRD 场景、不切分支、不提交或推送。进入工作树的代码与规范已经备份至 `evidence/backups/before-clinical-motion-20261004.zip`，基线记录在 `evidence/clinical-motion-20261004/baseline.json`。

## 确认原因
旧临床 `geometry.ts` 采用圆弧外耳，180 的主体宽实际还需加上两侧各8；这与此前认可的160×34 U型不是同一轮廓。旧 `useClinicalLayout.ts` 在 `nativeIsland || reduced` 时直接绘制终态，只有浏览器预览插值；因此原生展开缺少几何动效是明确的降级分支，不是 GSAP 失效。

## 修补
恢复与旧版 `silhouette` 完全相同的双三次底角、内收反向耳角，宽度定义为含耳角的总宽。临床富内容依旧是400基线宽度、按内容测量高度、可滚动的只读卡片，不退回旧单行通知。文字放大不被160×34硬高度阻挡。

正常原生路径与预览均使用旧版有限轻弹簧宽度插值，高度和收回单调；来源内容与外壳解耦。只保留旧“视图类型”作55ms退出，不冻结权限或患者快照。原生显示边界先准备，ACK后绘制，最后收敛到真实轮廓；固定 canvas 不是输入矩形。每次转换只有一个在途轮廓请求，后续更新合并为最新帧，旧 epoch/sequence/关闭阶段均不能覆盖新状态。

初次启动、减少动态、锁屏隐藏按终态提交；正常点击不再走静态降级。hover 不驱动尺寸或临床自动展开。内容按最终尺寸排版，测量独立的固有高度子节点，避免监听正在动画的高度造成反复启动。计时tick不重播进场，空闲不保留RAF或轮廓轮询。

## 规范同步
`Dynamic-Island-UI-Spec.md` 1.1 的3/4/9/10/13章为权威，JSON生成 `tokens.json` / `tokens.css`。更新 README、AGENTS、临床实现说明及PRD延续约束。明确把逐帧 HWND resize（仍禁止）与有限形变期的轮廓交接（受控允许）分开。数值重复生成不修改未变内容，避免无意义 Vite 重载。

Figma 本轮读取 `QPoJbcBvnCvyk2MPWjq2Uq / 3:576` 被 Starter 配额限制；未修改远端设计稿，也不将本地节点映射当作重新目视验收。

## 验证证据
当前命令、原生连续几何/真实点击、源跳转、抗锯齿、屏幕连续采样及限制记录在 `evidence/clinical-motion-20261004/`。最终统计由实际日志汇总，不沿用历史静态路径的测试结论。真实Windows DPI矩阵、Narrator、生产身份和临床接口不在本轮已验收范围。

SVG width/height/viewBox/path must have one animation owner. React declares only the initial size and must not replace the SVG viewport with target dimensions while the previously painted path is still present. Native screen capture caught transient collapse artifacts from that mismatch; the finite native regression samples viewport/surface equality as well as FPS.

## 最终验证（本轮代码）

TypeScript 类型检查、前端构建与 Windows Release 构建 PASS；157/157 单元测试、6/6 Rust 测试、52/52 E2E 全部 PASS。原生 22 次实际打开/收回转换有连续中间尺寸，HWND 几何变化为0；3个稳定状态抗锯齿截断均为0，200%/225%真实渲染字体与来源按钮可达性 PASS。原生准确对象来源窗口、写入拒绝、过期提交拒绝与中断收敛均 PASS。

两轮 Windows 合成背景实际截图共 95 帧，未捕获空白；6次背景真实点击全部收到，普通/重要动态不抢焦点。6秒 rAF 采样约 60.00fps，P95 17.0ms，不能当作 DWM 全帧呈现保证。空闲DOM更新为0。原生测试为 Windows11/96DPI，未替代其他OS/DPI/Narrator/生产接口验收。

初次全量测试与重复生成 tokens 并行时出现 Vite 重载，导致1项定位超时；trace已保留，并通过“未变token不重写”和串行执行修正，最终52项均在相同代码上重跑。原生初版屏幕采样捕获3处收回缩错：React先写目标SVG尺寸、旧path尚未交接。已改为单动效owner，并加入SVG尺寸/当前外壳一致性断言；保留修复前证据，不拿FPS掩盖问题。

最终数据：`evidence/clinical-motion-20261004/RESULTS.json`、`verified-commands.json`、`motion-native.json`、`windows-1.json`、`windows-2.json`。远端Figma仍受Starter额度限制，本轮不声称已重新目视核验或修改Figma。
