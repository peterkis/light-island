# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-continuation.spec.ts >> button press retains text size, spring releases and route failure is visible
- Location: tests\clinical-continuation.spec.ts:36:1

# Error details

```
Test timeout of 35000ms exceeded.
```

```
Error: locator.click: Test timeout of 35000ms exceeded.
Call log:
  - waiting for getByTestId('clinical-island').getByRole('button', { name: '打开危急值流程' })
    - locator resolved to <button class="ci-primary ux-primary">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <path class="ci-fill" data-shell="fill" d="M-10,0 L278.0476,0 C272.5248,0 268.0476,4.4772 268.0476,10 L268.0476,18.0395 C268.0476,26.0334 268.0476,30.326 265.1804,33.1932 C262.3132,36.0604 258.0206,36.0604 250.0267,36.0604 L18.0209,36.0604 C10.027,36.0604 5.7344,36.0604 2.8672,33.1932 C0,30.326 0,26.0334 0,18.0395 L0,10 C0,4.4772 -4.4772,0 -10,0 Z"></path> from <svg class="ci-shell" aria-hidden="true" width="288.0476153404218" height="36.060434855150554" viewBox="-10 0 288.0476153404218 36.060434855150554">…</svg> subtree intercepts pointer events
  - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <path class="ci-fill" data-shell="fill" d="M-10,0 L277.8322,0 C272.3094,0 267.8322,4.4772 267.8322,10 L267.8322,17.8935 C267.8322,25.8309 267.8322,30.0932 264.9853,32.9401 C262.1384,35.7871 257.8761,35.7871 249.9387,35.7871 L17.8935,35.7871 C9.9561,35.7871 5.6939,35.7871 2.8469,32.9401 C0,30.0932 0,25.8309 0,17.8935 L0,10 C0,4.4772 -4.4772,0 -10,0 Z"></path> from <svg class="ci-shell" aria-hidden="true" width="287.8322354335182" height="35.78706805023453" viewBox="-10 0 287.8322354335182 35.78706805023453">…</svg> subtree intercepts pointer events
  - retrying click action
    - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <path class="ci-fill" data-shell="fill" d="M-10,0 L277.9879,0 C272.4651,0 267.9879,4.4772 267.9879,10 L267.9879,17.9923 C267.9879,25.9735 267.9879,30.2594 265.1253,33.122 C262.2626,35.9847 257.9768,35.9847 249.9956,35.9847 L17.9923,35.9847 C10.0111,35.9847 5.7253,35.9847 2.8626,33.122 C0,30.2594 0,25.9735 0,17.9923 L0,10 C0,4.4772 -4.4772,0 -10,0 Z"></path> from <svg class="ci-shell" aria-hidden="true" width="287.987907369033" height="35.984651660695846" viewBox="-10 0 287.987907369033 35.984651660695846">…</svg> subtree intercepts pointer events
  - retrying click action
    - waiting 100ms
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

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
              - button "展开协作详情" [ref=e173] [cursor=pointer]:
                - generic [ref=e177]: 1 项
              - status: 危急值 · 1 项动态
          - generic: 来源事件 → 单一活动 → 授权快览 → 精确来源入口
        - generic [ref=e178]:
          - generic [ref=e179]:
            - generic [ref=e180]:
              - text: SOURCE STATE WALKTHROUGH
              - heading "危急值" [level=2] [ref=e181]
            - button "在灵动岛展开" [ref=e182] [cursor=pointer]
          - generic [ref=e186]:
            - button "1 新动态" [ref=e187] [cursor=pointer]:
              - generic [ref=e188]: "1"
              - text: 新动态
            - button "2 摘要" [ref=e189] [cursor=pointer]:
              - generic [ref=e190]: "2"
              - text: 摘要
            - button "3 入口就绪" [ref=e191] [cursor=pointer]:
              - generic [ref=e192]: "3"
              - text: 入口就绪
            - button "4 源已接收" [ref=e193] [cursor=pointer]:
              - generic [ref=e194]: "4"
              - text: 源已接收
            - button "5 源已闭环" [ref=e195] [cursor=pointer]:
              - generic [ref=e196]: "5"
              - text: 源已闭环
            - button "6 同步过期" [ref=e197] [cursor=pointer]:
              - generic [ref=e198]: "6"
              - text: 同步过期
          - generic [ref=e199]:
            - generic [ref=e200]: "01"
            - generic [ref=e201]:
              - strong [ref=e202]: 检验危急值已发布
              - paragraph [ref=e203]: 血清钾 · 来源标记危急。请进入原危急值流程核对。
          - generic [ref=e204]:
            - generic [ref=e205]: 这些按钮只驱动模拟源，不是临床操作按钮。
            - button "下一来源状态" [ref=e206] [cursor=pointer]
        - generic [ref=e209]:
          - generic [ref=e210]:
            - heading "当前会话 · 安全事件日志" [level=2] [ref=e211]
            - generic [ref=e212]: 1 / 20 项
          - paragraph [ref=e213]: S03 · 来源对象 v1 已同步
          - generic [ref=e215]:
            - generic [ref=e216]: 幂等去重 0
            - generic [ref=e217]: 格式拒绝 0
            - generic [ref=e218]: 容量提示 0
      - complementary [ref=e219]:
        - generic [ref=e220]: 验证控制台
        - generic [ref=e222]:
          - heading "当前演示权限" [level=3] [ref=e223]
          - paragraph [ref=e224]: 仅模拟岗位，不是医院真实身份认证。
          - generic [ref=e225]:
            - text: 查看岗位
            - combobox "演示岗位" [ref=e226]:
              - option "临床岗位" [selected]
              - option "费用协同岗位"
              - option "取送 / 设备岗位"
              - option "未登录"
          - generic [ref=e227]:
            - generic [ref=e233]: 隐私保护
            - switch "隐私保护" [ref=e234] [cursor=pointer]
          - generic [ref=e236]:
            - generic [ref=e241]: 模拟锁屏隐藏
            - switch "模拟锁屏隐藏" [ref=e242] [cursor=pointer]
          - generic [ref=e244]:
            - generic [ref=e249]: 模拟全屏避让
            - switch "模拟全屏避让" [ref=e250] [cursor=pointer]
        - generic [ref=e252]:
          - heading "来源与跳转异常" [level=3] [ref=e253]
          - generic [ref=e254]:
            - text: 来源状态
            - combobox "模拟来源状态" [ref=e255]:
              - option "连接正常" [selected]
              - option "同步过期"
              - option "来源离线"
          - generic [ref=e256]:
            - text: 来源入口
            - combobox "模拟入口结果" [ref=e257]:
              - option "精确匹配对象"
              - option "打开失败" [selected]
              - option "对象 / 版本不匹配"
          - button "重新读取来源" [ref=e258] [cursor=pointer]
        - generic [ref=e263]:
          - heading "可访问性与动效" [level=3] [ref=e264]
          - generic [ref=e265]:
            - generic [ref=e268]: 减少动态
            - switch "减少动态" [ref=e269] [cursor=pointer]
          - generic [ref=e271]:
            - generic [ref=e275]: 安静接收普通动态
            - switch "安静接收普通动态" [ref=e276] [cursor=pointer]
          - generic [ref=e278]:
            - text: 文本倍率
            - combobox "文本倍率" [ref=e279]:
              - option "100%" [selected]
              - option "200%"
              - option "225%"
          - paragraph [ref=e280]: 数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。
          - generic [ref=e281]:
            - generic [ref=e282]:
              - generic [ref=e283]: —
              - text: rAF / 秒
            - generic [ref=e284]:
              - generic [ref=e285]: —
              - text: P95 ms
          - button "采样预览 6 秒" [ref=e286] [cursor=pointer]
          - generic [ref=e289]: 不是原生呈现帧率保证
        - generic [ref=e290]:
          - button "重置本地模拟场景" [ref=e291] [cursor=pointer]
          - button "添加另一来源对象" [ref=e295] [cursor=pointer]
    - generic [ref=e296]:
      - generic [ref=e297]: SAMEWAVE / 临床协作感知
      - generic [ref=e298]: 原型 0.2 · 来源是事实，灵动岛是入口。
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
  40 |  await page.mouse.move(1,1000);await page.mouse.up();await expect.poll(()=>button.evaluate(el=>(el as HTMLElement).style.getPropertyValue('--ux-press'))).toBe('');
> 41 |  await post(request,{type:'clinical:configure',settings:{routeFault:'failed'}});await e.getByRole('button',{name:'打开危急值流程'}).click();await settle(page,'stack');await expect(e.getByRole('status')).toContainText('未能打开来源');expect(await page.getByRole('dialog').count()).toBe(0);
     |                                                                                                                              ^ Error: locator.click: Test timeout of 35000ms exceeded.
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