# Compact 悬停稳定性修复

## 基线与范围
本轮开始于 `main / c3eb719c8a8eba7e0dd09d8e74d3797a4437a94c`，工作树干净。未切换分支、提交、推送、合并或发布；未增加依赖。全部消息为本地模拟数据。

## 已确认的故障链
在原始行为上只加入可关闭的诊断后，以 Win32 SendInput 从左、右、底部和中心进入，每处停留 6 秒。左侧进入时记录到同一鼠标屏幕坐标附近的 `enter → leave → enter`，紧跟 HWND 改变；hover 及动画 epoch 因此被反复重建。
原生记录中的鼠标坐标 `[885,15]` 未改变，但窗口从 `[876,0,1044,38]` 调整至 `[865,0,1055,43]`，随后又回缩、扩展。前端记录在约 14.6ms 出现 leave，约 30.9ms 再 enter。
本轮复现的是进入瞬间的反馈抖动，不是停留数秒仍不停止的无限循环。没有证据将 GSAP 定性为无限循环，也没有将未复现的跨线程竞态写成已确认根因。

## 最小修补
1. `geometry.ts` 从 idle/hover 几何、CSS 宽度曲线的解析峰值、可用宽度、DPI、描边及 2 物理像素抗锯齿余量推导共同 canvas。GSAP compact 微动画本来就是单调曲线；CSS 的轻微超调及反复中断用闭合范围 `Δ×o/(1-o)` 覆盖。
2. `useMorph.ts` 的 begin 和 settle 都使用这个共同 canvas。通知真正展开仍可改变窗口；从消息态返回后恢复共同 compact canvas。减少动态下 hover 几何不变，不创建新 epoch 或空原生动画。
3. Rust 比较实际 HWND 物理矩形，相同则跳过 `SetWindowPos`。HRGN 偏移依据实际 `GetClientRect` 宽度和窗口 DPI，不再按 `target.width+8` 猜测。成功安装区域归 OS，重复、失败及临时区域正确释放。
4. compact 动画只在几何实际变化期间更新 silhouette HRGN，不改变 HWND。单个在途请求、可取消的按需帧回调和递增序号防止积压；没有常驻鼠标轮询或空闲帧循环。
5. 始终存在的 SVG 填充轮廓负责感知。内容层仍可退出、替换、inert；内容自身按同一曲线裁切。没有全宽锚点、透明矩形挡板或全屏窗口。
6. leave 增加 80ms 可取消保护，回调使用当前原生鼠标位置、真实 HRGN 与 painted DOM 复核。120ms peek 使用最新业务状态，并在离开、切换、明确收起和卸载时取消。
7. 同步原生命令保持原执行方式，不引入新调度框架。epoch、帧序号、closed 标志和 cancel 防止过期 begin、frame、commit 及卸载回调覆盖最新状态。

## 对旧文档的最小例外
“静止窗口必须收紧到当前外壳”不再适用于 compact：idle 和 hover 共用最小安全包围区，但可点击区域仍是当前 silhouette 加原有抗锯齿余量，不是整个 canvas。消息展开阶段原有的有限临时包围区策略保持不变；它不宣称逐像素穿透。

## 诊断开关与证据
正常启动不启用诊断。显式启动 `samewave-island.exe --qa-cdp --hover-diagnostics` 才允许本轮原生诊断；浏览器使用 `?hoverDiagnostics=1`。
日志为有界内存记录，保留请求/执行顺序、时间、hover、mode、epoch、phase、实际 HWND、DPI 和鼠标屏幕坐标。不记录患者正文。原生测试脚本只连接本项目专用 CDP 端口；真实鼠标采样是测试进程的有限任务。
本轮证据目录：`evidence/hover-fix-20260930/`。其中 `before-native.json` 是修补前原始记录，`final-commands.json` 是最终代码的命令执行结果；后续原生验收结果见该目录汇总。

## 最终验收结果
最终业务源码已重新执行：`npx tsc -b --pretty false` PASS；`npm test` 52/52 PASS；`npm run desktop:build`（包含前端构建和 Windows Release）PASS；`cargo test --manifest-path src-tauri/Cargo.toml --lib --release --locked` 4/4 PASS；`npm run test:e2e` 30/30 PASS。之后核对源码 SHA256，无测试后的业务代码变更。
Windows 11、真实窗口 DPI=96（100%）下，GSAP/CSS × notch/capsule × 正常/减少动态 × 左/右/底/中心，32 组合全部通过 `native-hover-audit.json` 的故障链断言：每处停留 6 秒，HWND 矩形不变；停留期间没有 false hover；正常模式进入和真正离开各一次 epoch，减少动态两者均零；真正离开仅一次 accepted leave；不抢焦点。
第一次原生采样中，3 个停留样本和 1 个离开样本存在额外真实鼠标移动（含超出测试区域的屏幕坐标），未当作静止验收通过。保留首轮原始数据，并在同一最终二进制上单独复测。另对左边缘重复采样；SendInput 绝对坐标映射的一像素取整差异不等同于外部移动。审计 JSON 标明每项采用哪份原始文件。
当前 100% 下，notch idle/hover 的 HWND 均为 179×41；capsule 均为 211×60。外壳几何仍分别是 160×34 ↔ 170×37、192×56 ↔ 202×56。共同包围区已包含 CSS 小超调和物理余量，并非把外壳改大。
真实 IPC 过期 begin/frame/commit、重复已关闭 epoch、无效未来请求检查 PASS；中途打断的 GSAP/CSS 通知仍在窗口视口内、贴顶并回到共同 compact canvas，按钮及收到回执 PASS。
三种主题的 idle/expanded 原生抗锯齿检查 6/6 PASS，截断像素为零；现有 `qa-notch-windows.py` 的展开态透明角背景真实点击、内部命中、普通和危急推送不抢焦点全部 PASS。
本轮消息形变 rAF 采样两条引擎均约 60fps，P95 16.9ms；这是该机器的 WebView 调度节奏，不是 DWM 实际呈现帧保证，也不是所有终端性能承诺。

## NOT_RUN 与明确限制
- 真实 Windows 125%、150%、200% 缩放、混合 DPI 多屏/热拔插和 Windows 10：本机实际验收为 Windows 11/100%，未改动用户系统显示设置。四种缩放的纯几何/Rust 坐标回归及浏览器 DPR 已通过，但不能替代上述原生验收。
- compact 独立多角背景“真实点击”补充矩阵：新测试脚本写入被工具安全检查拦截，未执行，未保留不完整脚本。已通过的展开态背景真实点击及 compact 边缘输入检查，不被冒充为这一补充矩阵。
- 初始基线中的长期无限振荡未复现；本轮已确认并修补进入瞬间的原生几何/命中反馈，不声称重现了所有机器上的同一持续故障。

## 交付状态
保持 `main / c3eb719`，代码留在工作树供检查。依赖及锁文件未更改，无提交、推送、合并、发布。历史 evidence 被测试生成的新文件替换的部分已分离回本轮目录，不以历史截图充当本轮验证。
已退出 `--qa-cdp --hover-diagnostics`，按无参数正常启动当前 Release；9223 不监听，正常程序不记录 hover 诊断。启动状态、二进制 SHA256 见 `normal-launch.json`。
