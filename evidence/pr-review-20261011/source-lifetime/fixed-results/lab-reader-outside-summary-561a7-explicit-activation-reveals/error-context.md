# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-reader.spec.ts >> outside summary closes, outside reader masks and explicit activation reveals
- Location: tests\lab-reader.spec.ts:18:1

# Error details

```
Test timeout of 35000ms exceeded.
```

```
Error: locator.click: Test timeout of 35000ms exceeded.
Call log:
  - waiting for getByTestId('clinical-island').getByRole('button', { name: '已隐藏，轻触查看' })

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
            - generic [ref=f1e208]:
              - heading "检验报告阅读 · 阅后即焚" [level=2] [ref=f1e209]
              - paragraph [ref=f1e210]: 模拟报告在岛内渐进展开，焚毁只清除本次快览
            - button "重播：收到检验报告" [ref=f1e211] [cursor=pointer]
          - generic [ref=f1e212]:
            - button "全部正常夹具" [ref=f1e213] [cursor=pointer]
            - button "定性与缺失值夹具" [ref=f1e214] [cursor=pointer]
        - generic [ref=f1e215]:
          - generic [ref=f1e216]:
            - heading "当前会话 · 安全事件日志" [level=2] [ref=f1e217]
            - generic [ref=f1e218]: 1 / 20 项
          - paragraph [ref=f1e219]: 选择一个场景，第一条来源动态将出现在这里。
          - generic [ref=f1e220]:
            - generic [ref=f1e221]: 幂等去重 0
            - generic [ref=f1e222]: 格式拒绝 0
            - generic [ref=f1e223]: 容量提示 0
      - complementary [ref=f1e224]:
        - generic [ref=f1e225]: 验证控制台
        - generic [ref=f1e227]:
          - heading "当前演示权限" [level=3] [ref=f1e228]
          - paragraph [ref=f1e229]: 仅模拟岗位，不是医院真实身份认证。
          - generic [ref=f1e230]:
            - text: 查看岗位
            - combobox "演示岗位" [ref=f1e231]:
              - option "临床岗位" [selected]
              - option "费用协同岗位"
              - option "取送 / 设备岗位"
              - option "未登录"
          - generic [ref=f1e232]:
            - generic [ref=f1e238]: 隐私保护
            - switch "隐私保护" [ref=f1e239] [cursor=pointer]
          - generic [ref=f1e241]:
            - generic [ref=f1e246]: 模拟锁屏隐藏
            - switch "模拟锁屏隐藏" [ref=f1e247] [cursor=pointer]
          - generic [ref=f1e249]:
            - generic [ref=f1e254]: 模拟全屏避让
            - switch "模拟全屏避让" [ref=f1e255] [cursor=pointer]
        - generic [ref=f1e257]:
          - heading "来源与跳转异常" [level=3] [ref=f1e258]
          - generic [ref=f1e259]:
            - text: 来源状态
            - combobox "模拟来源状态" [ref=f1e260]:
              - option "连接正常" [selected]
              - option "同步过期"
              - option "来源离线"
          - generic [ref=f1e261]:
            - text: 来源入口
            - combobox "模拟入口结果" [ref=f1e262]:
              - option "精确匹配对象" [selected]
              - option "打开失败"
              - option "对象 / 版本不匹配"
          - button "重新读取来源" [ref=f1e263] [cursor=pointer]
        - generic [ref=f1e268]:
          - heading "可访问性与动效" [level=3] [ref=f1e269]
          - generic [ref=f1e270]:
            - generic [ref=f1e273]: 减少动态
            - switch "减少动态" [ref=f1e274] [cursor=pointer]
          - generic [ref=f1e276]:
            - generic [ref=f1e280]: 安静接收普通动态
            - switch "安静接收普通动态" [ref=f1e281] [cursor=pointer]
          - generic [ref=f1e283]:
            - text: 文本倍率
            - combobox "文本倍率" [ref=f1e284]:
              - option "100%" [selected]
              - option "200%"
              - option "225%"
          - paragraph [ref=f1e285]: 数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。
          - generic [ref=f1e286]:
            - generic [ref=f1e287]:
              - generic [ref=f1e288]: —
              - text: rAF / 秒
            - generic [ref=f1e289]:
              - generic [ref=f1e290]: —
              - text: P95 ms
          - button "采样预览 6 秒" [ref=f1e291] [cursor=pointer]
          - generic [ref=f1e294]: 不是原生呈现帧率保证
        - generic [ref=f1e295]:
          - button "重置本地模拟场景" [ref=f1e296] [cursor=pointer]
          - button "添加另一来源对象" [ref=f1e300] [cursor=pointer]
    - generic [ref=f1e301]:
      - generic [ref=f1e302]: SAMEWAVE / 临床协作感知
      - generic [ref=f1e303]: 原型 0.2 · 来源是事实，灵动岛是入口。
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {evidencePath} from './evidence-path';
  3  | const base='http://127.0.0.1:17322';
  4  | const push=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
  5  | const island=(page:any)=>page.getByTestId('clinical-island');
  6  | async function capture(page:any,name:string){const b=(await island(page).boundingBox())!;await page.screenshot({path:evidencePath('lab-reader/'+name+'.png'),clip:{x:Math.max(0,b.x-32),y:Math.max(0,b.y-8),width:b.width+64,height:b.height+48}});}
  7  | async function settled(page:any,state:string){await expect(island(page)).toHaveAttribute('data-lab-state',state);await expect(island(page)).toHaveAttribute('data-motion-phase','settled',{timeout:8000});}
  8  | async function report(page:any,request:any,variant='baseline'){
  9  |  await push(request,{type:'clinical:scenario',scenario:'S04',stage:0,labVariant:variant});await settled(page,'alert');await island(page).getByRole('button',{name:'查看检验报告摘要'}).click();await settled(page,'sum');await expect(island(page).getByRole('button',{name:'阅读报告',exact:true})).toBeEnabled();
  10 | }
  11 | async function read(page:any,request:any,variant='baseline'){await report(page,request,variant);await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');}
  12 | async function freezeTime(page:any){await page.clock.pauseAt(await page.evaluate(()=>Date.now())+10000);}
  13 | test.beforeEach(async({page,request})=>{await page.clock.install();await push(request,{type:'clinical:reset'});await page.goto('/clinical.html');await expect(page.getByTestId('clinical-scenario-S04')).toBeVisible();await expect(island(page)).toHaveAttribute('data-motion-phase','settled');});
  14 | test('progressive same-body report and manual burn clear rows without source writes or undo',async({page,request})=>{
  15 |  await report(page,request);expect((await island(page).boundingBox())!.height).toBeCloseTo(200,1);await expect(island(page)).toContainText('WBC');await capture(page,'summary');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');expect((await island(page).boundingBox())!.height).toBeCloseTo(580,1);await expect(island(page).locator('.lab-row')).toHaveCount(8);expect(await island(page).locator('.wm,[style*="--wm"]').count()).toBe(0);await capture(page,'reader');
  16 |  const original=(await(await request.get(base+'/api/clinical-state')).json()).activities[0];await island(page).getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','burn');await expect(island(page)).toHaveAttribute('data-lab-state','done',{timeout:4000});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).toContainText('本次快览已清除');await expect(island(page)).toHaveAttribute('data-lab-state','idle',{timeout:4000});expect(await island(page).getByRole('button',{name:/撤销/}).count()).toBe(0);expect((await(await request.get(base+'/api/clinical-state')).json()).activities[0]).toEqual(original);
  17 | });
  18 | test('outside summary closes, outside reader masks and explicit activation reveals',async({page,request})=>{
> 19 |  await report(page,request);await page.getByTestId('clinical-background').click();await expect(island(page)).toHaveAttribute('data-lab-state','idle');await push(request,{type:'clinical:view',mode:'open',scenario:'S04'});await settled(page,'sum');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');await page.getByTestId('clinical-background').click();await expect(island(page).getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();await expect(island(page)).not.toContainText('张**');await expect(island(page).locator('.lab-row')).toHaveCount(0);await island(page).getByRole('button',{name:'已隐藏，轻触查看'}).click();await expect(island(page).locator('.lab-row')).toHaveCount(8);
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ^ Error: locator.click: Test timeout of 35000ms exceeded.
  20 | });
  21 | test('idle shield keeps counting while hovered; movement does not reveal',async({page,request})=>{
  22 |  await read(page,request);await island(page).locator('.lab-body').hover();const ring=island(page).locator('.lab-countdown span');const before=await ring.textContent();await page.waitForTimeout(1200);expect(await ring.textContent()).toBe(before);await page.waitForTimeout(7200);await expect(island(page).getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();await page.mouse.move(700,100);await expect(island(page).locator('.lab-row')).toHaveCount(0);const masked=Number(await ring.textContent());await page.waitForTimeout(1200);expect(Number(await ring.textContent())).toBeLessThan(masked);
  23 | });
  24 | test('current revision/permission invalidation removes sensitive rows and rejects old sessions',async({page,request})=>{
  25 |  await read(page,request);await push(request,{type:'clinical:configure',settings:{privacy:true}});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).not.toContainText('张**');await push(request,{type:'clinical:configure',settings:{privacy:false}});await push(request,{type:'clinical:view',mode:'open',scenario:'S04'});await settled(page,'sum');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');await push(request,{type:'clinical:scenario',scenario:'S04',stage:1});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).toHaveAttribute('data-lab-state','idle');
  26 | });
  27 | test('important events queue during reading and personal timer deadline is unchanged',async({page,request})=>{
  28 |  await push(request,{type:'clinical:personal',command:'start',duration:60000});await read(page,request);const before=(await(await request.get(base+'/api/clinical-state')).json()).timer.deadline;await push(request,{type:'clinical:scenario',scenario:'S03',stage:0});await expect(island(page)).toHaveAttribute('data-lab-state','read');await expect(island(page)).toContainText('血常规');expect((await(await request.get(base+'/api/clinical-state')).json()).timer.deadline).toBe(before);
  29 | });
  30 | test('normal, qualitative and missing reports render without invalid ranges',async({page,request})=>{
  31 |  await read(page,request,'normal');await expect(island(page).locator('.lab-row')).toHaveCount(8);await expect(island(page)).toContainText('其余 8 项正常');await push(request,{type:'clinical:reset'});await read(page,request,'extended');await expect(island(page).locator('.lab-row')).toHaveCount(12);await expect(island(page)).toContainText('阳性');await expect(island(page).locator('.lab-bar')).toHaveCount(8);
  32 | });
  33 | test('keyboard Escape burns and reduced motion bypasses the burn effect',async({page,request})=>{
  34 |  await push(request,{type:'clinical:configure',settings:{reduced:true}});await read(page,request);await island(page).getByRole('button',{name:'阅后即焚',exact:true}).focus();await page.keyboard.press('Escape');await expect(island(page)).toHaveAttribute('data-lab-state','done',{timeout:1000});await expect(island(page).locator('.lab-row')).toHaveCount(0);
  35 | });
  36 | test('explicit reading and privacy reveal keep focus inside the reader for Escape',async({page,request})=>{
  37 |  await push(request,{type:'clinical:configure',settings:{reduced:true}});await read(page,request);
  38 |  const region=island(page).getByRole('region',{name:'检验项目滚动区域'});await expect(region).toBeFocused();
  39 |  await freezeTime(page);await island(page).getByRole('button',{name:'已隐藏，轻触查看'}).click();await expect(region).toBeFocused();
  40 |  await page.keyboard.press('Escape');await page.clock.runFor(60);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
  41 | });
  42 | test('complete report opens the matching read-only source and reader loses focus safely',async({page,request})=>{
  43 |  await read(page,request);await island(page).getByRole('button',{name:'完整报告',exact:true}).click();const source=page.getByRole('dialog',{name:'模拟来源边界'});await expect(source).toBeVisible();await expect(source.locator('.lab-row')).toHaveCount(8);await expect(source).toContainText('DEMO-S04');
  44 | });
  45 | test('elapsed deadline burns automatically and burn ignores replay and pointer actions',async({page,request})=>{
  46 |  await read(page,request);await freezeTime(page);await page.mouse.move(1,1000);await page.clock.fastForward(60001);await expect(island(page)).toHaveAttribute('data-lab-state','burn');await expect(page.getByRole('button',{name:'重播：收到检验报告'})).toBeDisabled();await page.clock.runFor(1150);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
  47 | });
  48 | test('a live reduced-motion change applies to automatic clearing',async({page,request})=>{
  49 |  await read(page,request);await push(request,{type:'clinical:configure',settings:{reduced:true}});await expect(island(page)).toHaveClass(/ci-reduced/);await freezeTime(page);await page.mouse.move(1,1000);await page.clock.fastForward(60001);await page.clock.runFor(60);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
  50 | });
  51 | test('large text and forced colors retain scroll and actionable footer',async({page,request})=>{
  52 |  await push(request,{type:'clinical:configure',settings:{textScale:2.25,reduced:true}});await read(page,request);const scroller=island(page).locator('.lab-body');expect(await scroller.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);expect(await island(page).locator('.lab-name').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(31.5,1);expect(await island(page).locator('.lab-countdown span').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(24.75,1);
  53 |  const footer=(await island(page).locator('.lab-reader-footer').boundingBox())!,desktop=(await page.locator('.cs-desktop').boundingBox())!;expect(footer.y+footer.height).toBeLessThanOrEqual(desktop.y+desktop.height);await capture(page,'reader-225');await page.emulateMedia({forcedColors:'active'});await island(page).getByRole('button',{name:'阅后即焚',exact:true}).focus();await expect(island(page).getByRole('button',{name:'阅后即焚',exact:true})).toBeFocused();expect(await island(page).locator('.lab-bar').first().evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(await island(page).locator('.lab-zone').first().evaluate(e=>getComputedStyle(e).backgroundColor));await capture(page,'reader-forced-colors');await island(page).getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page)).toHaveAttribute('data-motion-phase','settled');expect(await island(page).locator('.lab-done').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight)).toBe(true);
  54 | });
  55 | 
```