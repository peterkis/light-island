# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-continuation.spec.ts >> button press retains text size, spring releases and route failure is visible
- Location: tests\clinical-continuation.spec.ts:36:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: ""
Received: "0.9360768092980483"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "同频 临床协作感知" [ref=e5] [cursor=pointer]:
      - /url: /clinical.html
      - generic [ref=e9]: 同频
      - text: 临床协作感知
    - generic [ref=e11]: 原型验证 · 仅模拟数据
    - link "旧版动效回归" [ref=e12] [cursor=pointer]:
      - /url: /index.html
  - main [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]: HOSPITAL COLLABORATION / CLINICAL ISLAND
        - heading "关键变化，抵达当前工作。" [level=1] [ref=e20]
        - paragraph [ref=e21]: 辅助感知与只读快览。判断、接收与处置，始终留在权威源系统。
      - generic [ref=e22]: 模拟消息源已连接
    - generic [ref=e24]:
      - complementary [ref=e25]:
        - generic [ref=e26]:
          - text: 场景库
          - generic [ref=e31]: 09 + 06
        - button "01 个人番茄钟 个人工具 · 不改变临床优先级" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]: "01"
          - generic [ref=e37]:
            - text: 个人番茄钟
            - generic [ref=e38]: 个人工具 · 不改变临床优先级
        - button "02 病危医嘱 核心场景 · 来源流程镜像" [ref=e41] [cursor=pointer]:
          - generic [ref=e42]: "02"
          - generic [ref=e46]:
            - text: 病危医嘱
            - generic [ref=e47]: 核心场景 · 来源流程镜像
        - button "03 危急值 核心场景 · 来源流程镜像" [ref=e50] [cursor=pointer]:
          - generic [ref=e51]: "03"
          - generic [ref=e54]:
            - text: 危急值
            - generic [ref=e55]: 核心场景 · 来源流程镜像
        - button "04 关注报告 核心场景 · 来源流程镜像" [ref=e58] [cursor=pointer]:
          - generic [ref=e59]: "04"
          - generic [ref=e64]:
            - text: 关注报告
            - generic [ref=e65]: 核心场景 · 来源流程镜像
        - button "05 费用协同 核心场景 · 来源流程镜像" [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: "05"
          - generic [ref=e73]:
            - text: 费用协同
            - generic [ref=e74]: 核心场景 · 来源流程镜像
        - button "06 交班未结项 核心场景 · 来源流程镜像" [ref=e77] [cursor=pointer]:
          - generic [ref=e78]: "06"
          - generic [ref=e82]:
            - text: 交班未结项
            - generic [ref=e83]: 核心场景 · 来源流程镜像
        - button "07 出院后回报 核心场景 · 来源流程镜像" [ref=e86] [cursor=pointer]:
          - generic [ref=e87]: "07"
          - generic [ref=e91]:
            - text: 出院后回报
            - generic [ref=e92]: 核心场景 · 来源流程镜像
        - button "08 报告更正 / 撤回 核心场景 · 来源流程镜像" [ref=e95] [cursor=pointer]:
          - generic [ref=e96]: "08"
          - generic [ref=e99]:
            - text: 报告更正 / 撤回
            - generic [ref=e100]: 核心场景 · 来源流程镜像
        - button "09 标本退回 / 补采 核心场景 · 来源流程镜像" [ref=e103] [cursor=pointer]:
          - generic [ref=e104]: "09"
          - generic [ref=e108]:
            - text: 标本退回 / 补采
            - generic [ref=e109]: 核心场景 · 来源流程镜像
        - button "展开 6 个研究扩展" [ref=e112] [cursor=pointer]
        - paragraph [ref=e119]: 不连接真实临床系统。不向源系统提交接收、处置或派单。
      - generic [ref=e120]:
        - generic [ref=e121]:
          - generic [ref=e122]: 工作站中的灵动岛
          - generic [ref=e123]: 点击展开 · 120ms 悬停微扩
        - generic [ref=e124]:
          - generic [ref=e125]:
            - text: 临床工作空间
            - generic [ref=e129]: — □ ×
          - generic [ref=e130]:
            - complementary [ref=e131]
            - generic [ref=e145]:
              - generic [ref=e146]: 临床工作 / 当班工作台
              - heading "专注当前任务" [level=2] [ref=e147]
              - paragraph [ref=e148]: 上方的变化，不打断正在进行的业务。
              - generic [ref=e149]:
                - text: 当前任务
                - generic [ref=e150]: 今日动态
              - generic [ref=e151]:
                - generic [ref=e152]: "01"
                - text: 核对当前工作记录
                - generic [ref=e153]: 演示工作项
              - generic [ref=e155]:
                - generic [ref=e156]: "02"
                - text: 查看来源业务状态
                - generic [ref=e157]: 演示工作项
              - generic [ref=e159]:
                - generic [ref=e160]: "03"
                - text: 整理交班关注事项
                - generic [ref=e161]: 演示工作项
              - generic [ref=e163]:
                - generic [ref=e164]: "04"
                - text: 记录个人待办
                - generic [ref=e165]: 演示工作项
              - button "验证背景操作" [ref=e167] [cursor=pointer]
          - generic:
            - generic:
              - generic [ref=e172]:
                - generic [ref=e173]:
                  - generic [ref=e177]: LIS
                  - time [ref=e178]: 16:25
                  - button "收起协作详情" [ref=e179] [cursor=pointer]
                - generic [ref=e187]:
                  - heading "检验危急值已发布" [level=2] [ref=e188]
                  - paragraph [ref=e189]: 源系统：待接收
                - generic [ref=e190]:
                  - button "活动与个人工具" [ref=e191] [cursor=pointer]
                  - button "详情" [active] [ref=e196] [cursor=pointer]
                  - button "打开危急值流程" [ref=e197] [cursor=pointer]
              - status: 危急值 · 1 项动态
          - generic: 来源事件 → 单一活动 → 授权快览 → 精确来源入口
        - generic [ref=e201]:
          - generic [ref=e202]:
            - generic [ref=e203]:
              - text: SOURCE STATE WALKTHROUGH
              - heading "危急值" [level=2] [ref=e204]
            - button "在灵动岛展开" [ref=e205] [cursor=pointer]
          - generic [ref=e209]:
            - button "1 新动态" [ref=e210] [cursor=pointer]:
              - generic [ref=e211]: "1"
              - text: 新动态
            - button "2 摘要" [ref=e212] [cursor=pointer]:
              - generic [ref=e213]: "2"
              - text: 摘要
            - button "3 入口就绪" [ref=e214] [cursor=pointer]:
              - generic [ref=e215]: "3"
              - text: 入口就绪
            - button "4 源已接收" [ref=e216] [cursor=pointer]:
              - generic [ref=e217]: "4"
              - text: 源已接收
            - button "5 源已闭环" [ref=e218] [cursor=pointer]:
              - generic [ref=e219]: "5"
              - text: 源已闭环
            - button "6 同步过期" [ref=e220] [cursor=pointer]:
              - generic [ref=e221]: "6"
              - text: 同步过期
          - generic [ref=e222]:
            - generic [ref=e223]: "01"
            - generic [ref=e224]:
              - strong [ref=e225]: 检验危急值已发布
              - paragraph [ref=e226]: 血清钾 · 来源标记危急。请进入原危急值流程核对。
          - generic [ref=e227]:
            - generic [ref=e228]: 这些按钮只驱动模拟源，不是临床操作按钮。
            - button "下一来源状态" [ref=e229] [cursor=pointer]
        - generic [ref=e232]:
          - generic [ref=e233]:
            - heading "当前会话 · 安全事件日志" [level=2] [ref=e234]
            - generic [ref=e235]: 1 / 20 项
          - paragraph [ref=e236]: S03 · 来源对象 v1 已同步
          - generic [ref=e238]:
            - generic [ref=e239]: 幂等去重 0
            - generic [ref=e240]: 格式拒绝 0
            - generic [ref=e241]: 容量提示 0
      - complementary [ref=e242]:
        - generic [ref=e243]: 验证控制台
        - generic [ref=e245]:
          - heading "当前演示权限" [level=3] [ref=e246]
          - paragraph [ref=e247]: 仅模拟岗位，不是医院真实身份认证。
          - generic [ref=e248]:
            - text: 查看岗位
            - combobox "演示岗位" [ref=e249]:
              - option "临床岗位" [selected]
              - option "费用协同岗位"
              - option "取送 / 设备岗位"
              - option "未登录"
          - generic [ref=e250]:
            - generic [ref=e256]: 隐私保护
            - switch "隐私保护" [ref=e257] [cursor=pointer]
          - generic [ref=e259]:
            - generic [ref=e264]: 模拟锁屏隐藏
            - switch "模拟锁屏隐藏" [ref=e265] [cursor=pointer]
          - generic [ref=e267]:
            - generic [ref=e272]: 模拟全屏避让
            - switch "模拟全屏避让" [ref=e273] [cursor=pointer]
        - generic [ref=e275]:
          - heading "来源与跳转异常" [level=3] [ref=e276]
          - generic [ref=e277]:
            - text: 来源状态
            - combobox "模拟来源状态" [ref=e278]:
              - option "连接正常" [selected]
              - option "同步过期"
              - option "来源离线"
          - generic [ref=e279]:
            - text: 来源入口
            - combobox "模拟入口结果" [ref=e280]:
              - option "精确匹配对象" [selected]
              - option "打开失败"
              - option "对象 / 版本不匹配"
          - button "重新读取来源" [ref=e281] [cursor=pointer]
        - generic [ref=e286]:
          - heading "可访问性与动效" [level=3] [ref=e287]
          - generic [ref=e288]:
            - generic [ref=e291]: 减少动态
            - switch "减少动态" [ref=e292] [cursor=pointer]
          - generic [ref=e294]:
            - generic [ref=e298]: 安静接收普通动态
            - switch "安静接收普通动态" [ref=e299] [cursor=pointer]
          - generic [ref=e301]:
            - text: 文本倍率
            - combobox "文本倍率" [ref=e302]:
              - option "100%" [selected]
              - option "200%"
              - option "225%"
          - paragraph [ref=e303]: 数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。
          - generic [ref=e304]:
            - generic [ref=e305]:
              - generic [ref=e306]: —
              - text: rAF / 秒
            - generic [ref=e307]:
              - generic [ref=e308]: —
              - text: P95 ms
          - button "采样预览 6 秒" [ref=e309] [cursor=pointer]
          - generic [ref=e312]: 不是原生呈现帧率保证
        - generic [ref=e313]:
          - button "重置本地模拟场景" [ref=e314] [cursor=pointer]
          - button "添加另一来源对象" [ref=e318] [cursor=pointer]
    - generic [ref=e319]:
      - generic [ref=e320]: SAMEWAVE / 临床协作感知
      - generic [ref=e321]: 原型 0.2 · 来源是事实，灵动岛是入口。
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
  33 |  expect(await sample).toContain('true');await settle(page,'compact');await expect(e).toHaveAttribute('data-neck','false');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
  34 |  await page.emulateMedia({reducedMotion:'reduce'});await settle(page,'compact');expect(await e.locator('[data-neck]').getAttribute('d')).toBe('');
  35 | });
  36 | test('button press retains text size, spring releases and route failure is visible',async({page,request})=>{
  37 |  await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});const e=await settle(page,'rich'),button=e.getByRole('button',{name:'详情',exact:true}),r=(await button.boundingBox())!;
  38 |  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(100);
  39 |  expect(await button.evaluate(el=>getComputedStyle(el).transform)).toBe('none');expect(await button.evaluate(el=>Number((el as HTMLElement).style.getPropertyValue('--ux-press')))).toBeLessThan(.99);
> 40 |  const host=(await e.boundingBox())!;await page.mouse.move(host.x+190,host.y+50);await page.mouse.up();await expect.poll(()=>button.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ux-press'))).toBe('');
     |                                                                                                                                                                                                             ^ Error: expect(received).toBe(expected) // Object.is equality
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