from pathlib import Path
import json,hashlib,subprocess,datetime,statistics
root=Path(__file__).resolve().parent.parent;out=root/'evidence/uiux-final-20261006'
def load(p):return json.loads((out/p).read_text(encoding='utf-8-sig'))
expected=load('tested-hashes.json');different=[name for name,digest in expected.items() if not (root/name).exists() or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest]
if different:raise SystemExit('Tested files changed: '+repr(different))
commands=load('final-commands.json');e2e=load('final-e2e.json');native=load('native-validation.json');windows=load('windows/native-click-focus.json');shadow=load('shadow-windows/native-click-focus.json');paint=load('paint-cadence.json');before=load('before-performance/paint-cadence.json');memory=load('process-tree.json');launch=load('normal-launch.json')
assert all(c['exitCode']==0 for c in commands) and e2e['exitCode']==0
assert native['pass'] and windows['pass'] and shadow['pass'] and launch['qaPortClosed']
check=subprocess.run(['git','diff','--check'],cwd=root,text=True,capture_output=True,encoding='utf8',errors='replace')
(out/'diff-check.txt').write_text(check.stdout+check.stderr,encoding='utf8')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();assert head=='fcf599088d8c6f413339ef3086946c0417f7c847'
branch=subprocess.check_output(['git','branch','--show-current'],cwd=root,text=True).strip()
status=subprocess.check_output(['git','status','--short'],cwd=root,text=True);(out/'final-worktree.txt').write_text(status,encoding='utf8')
result={
 'at':datetime.datetime.now().astimezone().isoformat(),'overall':'CORE_IMPLEMENTED_AND_TESTED; full specification acceptance remains PARTIAL',
 'branch':branch,'head':head,'committed':False,'pushed':False,'allTestedSourceAndExeHashesMatch':not different,
 'authoritativeSpec':'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md','specUnchanged':hashlib.sha256((root/'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md').read_bytes()).hexdigest()=='a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa',
 'tests':{'typecheck':'PASS','typescriptUnit':{'passed':172,'failed':0},'rustUnit':{'passed':6,'failed':0},'selectedE2E':{'passed':48,'failed':0,'excluded':e2e['excluded']},'desktopBuild':'PASS','gitDiffCheck':check.returncode},
 'windows':{'environment':'Windows 11, primary 1920x1080, 96 DPI','physicalOpenClose':len(native['transitions'])*2,'normalTransitionHWNDChanges':sum(r['windowChanges'] for r in native['transitions']),'exactSourceObjectOpened':native['sourceOpenedExactObject'],'clinicalWriteDenied':native['clinicalWriteAndSimulatorDenied'],'ownedBackgroundClicks':len(windows['receivedClicks'])+len(shadow['receivedClicks']),'actualShadowClick':True,'pushPreservesFocus':windows['importantPreservesFocus'] and windows['routinePreservesFocus'] and shadow['importantPreservesFocus'] and shadow['routinePreservesFocus'],'screenFrames':len(windows['frames'])+len(shadow['frames']),'blankFrames':windows['blankFrames']+shadow['blankFrames'],'idleDOMMutations':native['idleMutations']},
 'performance':{'luminanceBeforeMs':[r['ms'] for r in load('before-performance/luminance-cost.json')],'luminanceAfterMs':[r['ms'] for r in load('luminance-cost.json')],'rAFfps':paint['rAFfps'],'p95ms':paint['p95ms'],'over25ms':paint['over25ms'],'beforeUnchangedMovingSamples':before['unchangedMovingSamples'],'beforeMovingSamples':before['movingSamples'],'afterUnchangedMovingSamples':paint['unchangedMovingSamples'],'afterMovingSamples':paint['movingSamples'],'cadenceMeaning':'rAF/geometry samples, not DWM present telemetry or a dropped-frame-rate measurement','memory':memory},
 'notRun':['Windows 10 physical','125/150/200% physical OS scaling and mixed-DPI/hotplug','120Hz display and DWM/ETW frame pacing','GPU utilization','Narrator UI Automation walkthrough','full touch target matrix','all external screen-sharing products and Windows Focus Assist integration'],
 'partial':['S2 separate satellite is functional; viscous neck not implemented','dedicated button spring hook and failure shake not implemented; CSS press feedback present','source-specific mute, full swipe-dismiss/undo and compact marquee are not complete','Hidden entry/exit uses safe immediate visibility at OS/privacy boundary instead of every decorative stage','universal media/email/call/AI adapters are not included in clinical prototype','3 original accessibility cases retain obsolete dimensions and were excluded; replacement write was blocked'],
 'normalLaunch':launch
}
(out/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
p=root/'docs/UIUX-V1-IMPLEMENTATION.md'
p.write_text(p.read_text(encoding='utf8')+f'''\n## 最终原生性能修补与验收（{result['at']}）\n\n检测到 96 次同步 GetPixel 的亮度采样在本机消耗 2.1–3.2 秒，虽 rAF 仍有 60Hz，但阻塞了原生轮廓呈现。现改为一次受限 BitBlt 到临时内存 DIB，GdiFlush 后仅计算平均亮度并释放全部 GDI 资源，不保存桌面图像；动画期间跳过采样。实测调用降至 15.7–22ms。阴影距离计算避免通用 hypot，变形提交下降到约 8.9–12.8ms。\n\n相同采样脚本的未变化动画形体样本由 180/195 降至 27/197；该值包含收回等待及有限 IPC 交接，不是 DWM 掉帧率。最终 rAF {paint['rAFfps']:.2f}Hz，P95 {paint['p95ms']:.1f}ms，>25ms {paint['over25ms']}。真实屏幕 {result['windows']['screenFrames']} 张采样均无整体空白，6 次专用背景点击通过，其中包含实际阴影像素区域。\n\n最终：类型检查、172 项 TS 单测、6 项 Rust 测试、48 项适用 E2E、Release 构建通过。旧 accessibility 文件 3 项尺寸断言未迁移，不计通过。实际源码及 EXE 与测试记录哈希一致。正常模式已恢复，9223 关闭。完整结果见 `evidence/uiux-final-20261006/RESULTS.json`。\n\n仍未完成的非核心细节：S2 粘滞颈部、独立按钮弹簧/失败抖动、每来源静音、完整滑走撤销、Compact 跑马灯。隐藏涉及权限/系统安全时立即隐藏，不为装饰动画延迟敏感内容保护。不得把以上部分或未测设备矩阵描述成完美验收。\n''',encoding='utf8')
print(json.dumps({k:result[k] for k in ['tests','windows','allTestedSourceAndExeHashesMatch','specUnchanged']},ensure_ascii=False,indent=2))
print(json.dumps({'memoryMiB':memory['privateWorkingSetMiB'],'privateCommitMiB':memory['privateMiB'],'cpuMachinePercent':memory['cpuMachinePercent'],'normalPID':launch['pid']},ensure_ascii=False))
