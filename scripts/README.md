# 操作说明
- `npm run dev:all`：浏览器试验台 http://127.0.0.1:1420 与模拟消息服务器。
- `npm run desktop:dev`：Tauri 开发窗口；请另外启动 `npm run demo:server`。
- `npm run desktop:build`：生成独立 release exe，不注册开机启动、不修改系统通知设置。
- `npm test`：队列和数据契约测试。
- `npm run test:e2e`：浏览器交互与截图回归。
- `start-prototype.cmd`：启动已构建的原生灵动岛与试验台。

生产前必须实现真实身份、WSS、消息持久化与补拉、临床升级规则、岗位权限、锁屏隐私、Windows 10/11 与多屏 DPI 验证。
