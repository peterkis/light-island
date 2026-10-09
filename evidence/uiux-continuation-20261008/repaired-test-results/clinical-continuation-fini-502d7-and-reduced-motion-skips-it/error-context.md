# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-continuation.spec.ts >> finite neck appears during split, vanishes at rest and reduced motion skips it
- Location: tests\clinical-continuation.spec.ts:29:1

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: "true"
Received array: ["false", "false", "false", "false", "false", "false", "false", "false", "false", "false", …]
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - link "同频 临床协作感知" [ref=f1e5] [cursor=pointer]:
      - /url: /clinical.html
      - generic [ref=f1e9]: 同频
      - text: 临床协作感知
    - generic [ref=f1e11]: 原型验证 · 仅模拟数据
    - link "旧版动效回归" [ref=f1e12] [cursor=pointer]:
      - /url: /index.html
  - main [ref=f1e16]:
    - generic [ref=f1e17]:
      - generic [ref=f1e18]:
        - generic [ref=f1e19]: HOSPITAL COLLABORATION / CLINICAL ISLAND
        - heading "关键变化，抵达当前工作。" [level=1] [ref=f1e20]
        - paragraph [ref=f1e21]: 辅助感知与只读快览。判断、接收与处置，始终留在权威源系统。
      - generic [ref=f1e22]: 模拟消息源已连接
    - generic [ref=f1e24]:
      - complementary [ref=f1e25]:
        - generic [ref=f1e26]:
          - text: 场景库
          - generic [ref=f1e31]: 09 + 06
        - button "01 个人番茄钟 个人工具 · 不改变临床优先级" [ref=f1e32] [cursor=pointer]:
          - generic [ref=f1e33]: "01"
          - generic [ref=f1e37]:
            - text: 个人番茄钟
            - generic [ref=f1e38]: 个人工具 · 不改变临床优先级
        - button "02 病危医嘱 核心场景 · 来源流程镜像" [ref=f1e41] [cursor=pointer]:
          - generic [ref=f1e42]: "02"
          - generic [ref=f1e46]:
            - text: 病危医嘱
            - generic [ref=f1e47]: 核心场景 · 来源流程镜像
        - button "03 危急值 核心场景 · 来源流程镜像" [ref=f1e50] [cursor=pointer]:
          - generic [ref=f1e51]: "03"
          - generic [ref=f1e54]:
            - text: 危急值
            - generic [ref=f1e55]: 核心场景 · 来源流程镜像
        - button "04 关注报告 核心场景 · 来源流程镜像" [ref=f1e58] [cursor=pointer]:
          - generic [ref=f1e59]: "04"
          - generic [ref=f1e64]:
            - text: 关注报告
            - generic [ref=f1e65]: 核心场景 · 来源流程镜像
        - button "05 费用协同 核心场景 · 来源流程镜像" [ref=f1e68] [cursor=pointer]:
          - generic [ref=f1e69]: "05"
          - generic [ref=f1e73]:
            - text: 费用协同
            - generic [ref=f1e74]: 核心场景 · 来源流程镜像
        - button "06 交班未结项 核心场景 · 来源流程镜像" [ref=f1e77] [cursor=pointer]:
          - generic [ref=f1e78]: "06"
          - generic [ref=f1e82]:
            - text: 交班未结项
            - generic [ref=f1e83]: 核心场景 · 来源流程镜像
        - button "07 出院后回报 核心场景 · 来源流程镜像" [ref=f1e86] [cursor=pointer]:
          - generic [ref=f1e87]: "07"
          - generic [ref=f1e91]:
            - text: 出院后回报
            - generic [ref=f1e92]: 核心场景 · 来源流程镜像
        - button "08 报告更正 / 撤回 核心场景 · 来源流程镜像" [ref=f1e95] [cursor=pointer]:
          - generic [ref=f1e96]: "08"
          - generic [ref=f1e99]:
            - text: 报告更正 / 撤回
            - generic [ref=f1e100]: 核心场景 · 来源流程镜像
        - button "09 标本退回 / 补采 核心场景 · 来源流程镜像" [ref=f1e103] [cursor=pointer]:
          - generic [ref=f1e104]: "09"
          - generic [ref=f1e108]:
            - text: 标本退回 / 补采
            - generic [ref=f1e109]: 核心场景 · 来源流程镜像
        - button "展开 6 个研究扩展" [ref=f1e112] [cursor=pointer]
        - paragraph [ref=f1e119]: 不连接真实临床系统。不向源系统提交接收、处置或派单。
      - generic [ref=f1e120]:
        - generic [ref=f1e121]:
          - generic [ref=f1e122]: 工作站中的灵动岛
          - generic [ref=f1e123]: 点击展开 · 120ms 悬停微扩
        - generic [ref=f1e124]:
          - generic [ref=f1e125]:
            - text: 临床工作空间
            - generic [ref=f1e129]: — □ ×
          - generic [ref=f1e130]:
            - complementary [ref=f1e131]
            - generic [ref=f1e145]:
              - generic [ref=f1e146]: 临床工作 / 当班工作台
              - heading "专注当前任务" [level=2] [ref=f1e147]
              - paragraph [ref=f1e148]: 上方的变化，不打断正在进行的业务。
              - generic [ref=f1e149]:
                - text: 当前任务
                - generic [ref=f1e150]: 今日动态
              - generic [ref=f1e151]:
                - generic [ref=f1e152]: "01"
                - text: 核对当前工作记录
                - generic [ref=f1e153]: 演示工作项
              - generic [ref=f1e155]:
                - generic [ref=f1e156]: "02"
                - text: 查看来源业务状态
                - generic [ref=f1e157]: 演示工作项
              - generic [ref=f1e159]:
                - generic [ref=f1e160]: "03"
                - text: 整理交班关注事项
                - generic [ref=f1e161]: 演示工作项
              - generic [ref=f1e163]:
                - generic [ref=f1e164]: "04"
                - text: 记录个人待办
                - generic [ref=f1e165]: 演示工作项
              - button "验证背景操作" [ref=f1e167] [cursor=pointer]
          - generic:
            - generic:
              - button "打开协作动态" [ref=f1e173] [cursor=pointer]
              - status
          - generic: 来源事件 → 单一活动 → 授权快览 → 精确来源入口
        - generic [ref=f1e175]:
          - generic [ref=f1e176]:
            - generic [ref=f1e177]:
              - text: SOURCE STATE WALKTHROUGH
              - heading "危急值" [level=2] [ref=f1e178]
            - button "在灵动岛展开" [ref=f1e179] [cursor=pointer]
          - generic [ref=f1e183]:
            - button "1 新动态" [ref=f1e184] [cursor=pointer]:
              - generic [ref=f1e185]: "1"
              - text: 新动态
            - button "2 摘要" [ref=f1e186] [cursor=pointer]:
              - generic [ref=f1e187]: "2"
              - text: 摘要
            - button "3 入口就绪" [ref=f1e188] [cursor=pointer]:
              - generic [ref=f1e189]: "3"
              - text: 入口就绪
            - button "4 源已接收" [ref=f1e190] [cursor=pointer]:
              - generic [ref=f1e191]: "4"
              - text: 源已接收
            - button "5 源已闭环" [ref=f1e192] [cursor=pointer]:
              - generic [ref=f1e193]: "5"
              - text: 源已闭环
            - button "6 同步过期" [ref=f1e194] [cursor=pointer]:
              - generic [ref=f1e195]: "6"
              - text: 同步过期
          - generic [ref=f1e196]:
            - generic [ref=f1e197]: "01"
            - generic [ref=f1e198]:
              - strong [ref=f1e199]: 检验危急值已发布
              - paragraph [ref=f1e200]: 血清钾 · 来源标记危急。请进入原危急值流程核对。
          - generic [ref=f1e201]:
            - generic [ref=f1e202]: 这些按钮只驱动模拟源，不是临床操作按钮。
            - button "下一来源状态" [ref=f1e203] [cursor=pointer]
        - generic [ref=f1e206]:
          - generic [ref=f1e207]:
            - heading "当前会话 · 安全事件日志" [level=2] [ref=f1e208]
            - generic [ref=f1e209]: 2 / 20 项
          - paragraph [ref=f1e210]: 选择一个场景，第一条来源动态将出现在这里。
          - generic [ref=f1e211]:
            - generic [ref=f1e212]: 幂等去重 0
            - generic [ref=f1e213]: 格式拒绝 0
            - generic [ref=f1e214]: 容量提示 0
      - complementary [ref=f1e215]:
        - generic [ref=f1e216]: 验证控制台
        - generic [ref=f1e218]:
          - heading "当前演示权限" [level=3] [ref=f1e219]
          - paragraph [ref=f1e220]: 仅模拟岗位，不是医院真实身份认证。
          - generic [ref=f1e221]:
            - text: 查看岗位
            - combobox "演示岗位" [ref=f1e222]:
              - option "临床岗位" [selected]
              - option "费用协同岗位"
              - option "取送 / 设备岗位"
              - option "未登录"
          - generic [ref=f1e223]:
            - generic [ref=f1e229]: 隐私保护
            - switch "隐私保护" [ref=f1e230] [cursor=pointer]
          - generic [ref=f1e232]:
            - generic [ref=f1e237]: 模拟锁屏隐藏
            - switch "模拟锁屏隐藏" [ref=f1e238] [cursor=pointer]
          - generic [ref=f1e240]:
            - generic [ref=f1e245]: 模拟全屏避让
            - switch "模拟全屏避让" [ref=f1e246] [cursor=pointer]
        - generic [ref=f1e248]:
          - heading "来源与跳转异常" [level=3] [ref=f1e249]
          - generic [ref=f1e250]:
            - text: 来源状态
            - combobox "模拟来源状态" [ref=f1e251]:
              - option "连接正常" [selected]
              - option "同步过期"
              - option "来源离线"
          - generic [ref=f1e252]:
            - text: 来源入口
            - combobox "模拟入口结果" [ref=f1e253]:
              - option "精确匹配对象" [selected]
              - option "打开失败"
              - option "对象 / 版本不匹配"
          - button "重新读取来源" [ref=f1e254] [cursor=pointer]
        - generic [ref=f1e259]:
          - heading "可访问性与动效" [level=3] [ref=f1e260]
          - generic [ref=f1e261]:
            - generic [ref=f1e264]: 减少动态
            - switch "减少动态" [ref=f1e265] [cursor=pointer]
          - generic [ref=f1e267]:
            - generic [ref=f1e271]: 安静接收普通动态
            - switch "安静接收普通动态" [ref=f1e272] [cursor=pointer]
          - generic [ref=f1e274]:
            - text: 文本倍率
            - combobox "文本倍率" [ref=f1e275]:
              - option "100%" [selected]
              - option "200%"
              - option "225%"
          - paragraph [ref=f1e276]: 数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。
          - generic [ref=f1e277]:
            - generic [ref=f1e278]:
              - generic [ref=f1e279]: —
              - text: rAF / 秒
            - generic [ref=f1e280]:
              - generic [ref=f1e281]: —
              - text: P95 ms
          - button "采样预览 6 秒" [ref=f1e282] [cursor=pointer]
          - generic [ref=f1e285]: 不是原生呈现帧率保证
        - generic [ref=f1e286]:
          - button "重置本地模拟场景" [ref=f1e287] [cursor=pointer]
          - button "添加另一来源对象" [ref=f1e291] [cursor=pointer]
    - generic [ref=f1e292]:
      - generic [ref=f1e293]: SAMEWAVE / 临床协作感知
      - generic [ref=f1e294]: 原型 0.2 · 来源是事实，灵动岛是入口。
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | const base='http://127.0.0.1:17322';
  3  | const post=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
  4  | const island=(page:any)=>page.getByTestId('clinical-island');
  5  | const settle=async(page:any,surface?:string)=>{const e=island(page);if(surface)await expect(e).toHaveAttribute('data-surface',surface);await expect(e).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);return e;};
  6  | test.beforeEach(async({page,request})=>{await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');await settle(page,'idle');});
  7  | 
  8  | test('swipe ignores only this preview and undo opens the exact intact source',async({page,request})=>{
  9  |  await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.hover();
  10 |  const before=await(await request.get(base+'/api/clinical-state')).json(),r=(await e.boundingBox())!;
  11 |  await page.mouse.move(r.x+100,r.y+45);await page.mouse.down();await page.mouse.move(r.x+280,r.y+45,{steps:8});await page.mouse.up();
  12 |  await settle(page,'idle');await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toBeVisible();
  13 |  expect((await(await request.get(base+'/api/clinical-state')).json()).activities).toEqual(before.activities);
  14 |  expect(await page.getByRole('dialog').count()).toBe(0);await e.getByRole('button',{name:'撤销忽略本次快览'}).click();await settle(page,'rich');await expect(e).toContainText(before.activities[0].title);
  15 | });
  16 | test('short drag returns with no source navigation and undo is time/version bounded',async({page,request})=>{
  17 |  await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert'),r=(await e.boundingBox())!;
  18 |  await page.mouse.move(r.x+100,r.y+45);await page.mouse.down();await page.mouse.move(r.x+120,r.y+45,{steps:5});await page.mouse.up();await settle(page,'alert');expect(await page.getByRole('dialog').count()).toBe(0);
  19 |  await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await post(request,{type:'clinical:scenario',scenario:'S04',stage:1});await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0);
  20 |  await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});await settle(page,'alert');await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0,{timeout:5000});
  21 | });
  22 | test('source mute is local, reversible and cannot suppress important events',async({page,request})=>{
  23 |  await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.getByRole('button',{name:'展开完整摘要'}).click();await settle(page,'rich');await e.click({button:'right'});await settle(page,'stack');
  24 |  await e.getByRole('button',{name:/静音此来源/}).click();await expect(e.getByRole('button',{name:/取消静音此来源/})).toHaveAttribute('aria-pressed','true');await e.getByRole('button',{name:'收起协作详情'}).click();await settle(page,'compact');
  25 |  await post(request,{type:'clinical:scenario',scenario:'S04',stage:1});await page.waitForTimeout(400);await expect(e).toHaveAttribute('data-surface','compact');
  26 |  const state=await(await request.get(base+'/api/clinical-state')).json();expect(state.activities[0].stage).toBe(1);
  27 |  await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await settle(page,'rich');await expect(e.getByRole('heading')).toContainText('危急值');
  28 | });
  29 | test('finite neck appears during split, vanishes at rest and reduced motion skips it',async({page,request})=>{
  30 |  await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'compact');
  31 |  const sample=e.evaluate(el=>new Promise<string[]>(resolve=>{const frames:string[]=[];const start=performance.now();const tick=()=>{frames.push(el.getAttribute('data-neck')??'');if(performance.now()-start<700)requestAnimationFrame(tick);else resolve(frames);};requestAnimationFrame(tick);}));
  32 |  await post(request,{type:'clinical:scenario',scenario:'S02',stage:0});await post(request,{type:'clinical:view',mode:'compact'});
> 33 |  expect(await sample).toContain('true');await settle(page,'compact');await expect(e).toHaveAttribute('data-neck','false');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
     |                       ^ Error: expect(received).toContain(expected) // indexOf
  34 |  await page.emulateMedia({reducedMotion:'reduce'});await settle(page,'compact');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
  35 | });
  36 | test('button press retains text size, spring releases and route failure is visible',async({page,request})=>{
  37 |  await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});const e=await settle(page,'rich'),button=e.getByRole('button',{name:'详情',exact:true}),r=(await button.boundingBox())!;
  38 |  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(100);
  39 |  expect(await button.evaluate(el=>getComputedStyle(el).transform)).toBe('none');expect(await button.evaluate(el=>Number((el as HTMLElement).style.getPropertyValue('--ux-press')))).toBeLessThan(.99);
  40 |  const host=(await e.boundingBox())!;await page.mouse.move(host.x+190,host.y+50);await page.mouse.up();await expect.poll(()=>button.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ux-press'))).toBe('');
  41 |  await post(request,{type:'clinical:configure',settings:{routeFault:'failed'}});await e.getByRole('button',{name:'打开危急值流程'}).click();await settle(page,'stack');await expect(e.getByRole('status')).toContainText('未能打开来源');expect(await page.getByRole('dialog').count()).toBe(0);
  42 | });
  43 | test('compact overflow makes one 30 DIP/s traversal and reduced motion keeps it static',async({page,request})=>{
  44 |  await post(request,{type:'clinical:configure',settings:{autoPreview:false,textScale:2.25}});await post(request,{type:'clinical:preferences',settings:{compactText:true}});await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'compact');await e.hover();
  45 |  const label=e.locator('.ux-compact-label');await expect(label).toHaveAttribute('data-overflow','true');
  46 |  const timing=await label.evaluate(el=>{const a=el.querySelector('span')!.getAnimations()[0];return a?.effect?.getTiming();});expect(timing?.iterations).toBe(1);expect(Number(timing?.duration)).toBeGreaterThan(2400);
  47 |  await page.emulateMedia({reducedMotion:'reduce'});await settle(page,'compact');expect(await label.evaluate(el=>el.querySelector('span')!.getAnimations().length)).toBe(0);
  48 | });
  49 | test('permission revocation immediately removes undo and compact sensitive text',async({page,request})=>{
  50 |  await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});const e=await settle(page,'alert');await e.getByRole('button',{name:'忽略本次快览'}).click();await settle(page,'idle');await post(request,{type:'clinical:configure',settings:{privacy:true}});await expect(e.getByRole('button',{name:'撤销忽略本次快览'})).toHaveCount(0);await expect(page.locator('.ci-sr')).toHaveText('新消息');
  51 | });
  52 | 
```