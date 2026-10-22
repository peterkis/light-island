# 开发、验证与 QA 脚本入口

命令定义以 [package.json](../package.json) 为准；职责见 [两应用拆分](../docs/APP-SPLIT-20261014.md)，按改动选择检查见 [验证指南](../docs/agents/validation.md)。

| 需要 | 入口 |
| --- | --- |
| 浏览器临床工作台/岛预览 | `npm run dev:clinical`，在 1420 打开对应 HTML；开发模拟源为 Node 适配器 |
| 独立原生开发 | `npm run desktop:dev:island`、`npm run desktop:dev:workbench`；工作台内置来源服务，岛不再创建 studio |
| 发布产物 | `npm run desktop:build` 构建两个 EXE 到 `dist/desktop`；`:island`/`:workbench` 可独立构建 |
| 已构建程序启动 | 根 `start-prototype.cmd` → `start-prototype.ps1`；支持 IslandOnly/WorkbenchOnly/Legacy/SourcePort |
| 轻量导航/输入校验 | `npm run instructions:check` → [check-project-guidance.mjs](check-project-guidance.mjs) |
| 已接线的前端检查 | `npm run check`；Windows [CI](../.github/workflows/validate.yml) 使用同一命令 |
| 浏览器回归 | `npm run test:e2e`；新的 `ISLAND_E2E_EVIDENCE_DIR` 输出，不能改写历史结果 |
| 来源协议、包依赖 | `npm run test:protocol`、`npm run bundle:check`；协议 Node 夹具不替代 Rust test |
| 自有原生进程管理 | [optimization-qa.ps1](optimization-qa.ps1)；按 PID、启动时间、EXE/端口归属管理 |
| 视觉、屏幕、点击/焦点 | [qa-uiux-visual-native.mjs](qa-uiux-visual-native.mjs)、[qa-click-native.mjs](qa-click-native.mjs)、[qa-reader-focus.ps1](qa-reader-focus.ps1) |
| 拆分应用与生命周期 | [qa-app-split-native.mjs](qa-app-split-native.mjs)；参数和证据字段以脚本及 [split 说明](../docs/APP-SPLIT-20261014.md) 为准 |

正常 EXE 运行不需要 Node。`dev:all`/`demo:server` 是 legacy 浏览器对照命令，不能作为当前两 EXE 的运行依赖。QA 端点显式开启且仅连接自有隔离 profile；脚本运行前确认当前参数和输出目录，不批量执行历史一次性补丁脚本。

本项目仅为合成只读原型；真实身份、医院接入、持久交付和完整 Windows/设备验收不由这些脚本证明。
