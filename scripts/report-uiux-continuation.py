"""Assemble current delivery index; retain every earlier validation record."""
from pathlib import Path
import datetime, hashlib, json, subprocess
root=Path(__file__).resolve().parent.parent
out=root/'evidence/uiux-continuation-20261008'
read=lambda name:json.loads((out/name).read_text(encoding='utf-8-sig'))
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
old=read('tested-hashes.json')
files=[p for d in ['src','src-tauri/src','server','tests'] for p in (root/d).rglob('*') if p.is_file()]
files += [root/'src-tauri/target/release/samewave-island.exe',root/'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md']
current={str(p.relative_to(root)).replace('\\','/'):sha(p) for p in files}
(out/'delivered-hashes.json').write_text(json.dumps(current,indent=2),encoding='utf8')
delta=[name for name,value in current.items() if old.get(name)!=value]
assert set(delta)<= {'src/clinical/CompactLabel.tsx','tests/clinical-continuation.spec.ts','src-tauri/target/release/samewave-island.exe'},delta
assert current['docs/Windows 灵动岛 UI UX 设计规范 v1.0.md']=='a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa'
unit=read('final-unit.json');full=read('final-e2e.json')['stats'];clinical=read('final-clinical-e2e.json')['stats'];marquee=read('final-marquee-e2e.json')['stats']
assert unit['numFailedTests']==0 and full['unexpected']==0 and clinical['unexpected']==0 and marquee['unexpected']==0
before=read('focus-before-push.json');after=read('focus-after-push.json');assert before['foreground']==after['foreground']
paint=read('native-continuity/analysis.json');assert paint['windowRectChanges']==0 and not paint['unpaintedCenterSamples']
report=dict(at=datetime.datetime.now().astimezone().isoformat(),overall='IMPLEMENTED; software verification passed; full device/native acceptance PARTIAL',
 branch=subprocess.check_output(['git','branch','--show-current'],cwd=root).decode().strip(),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),committed=False,pushed=False,published=False,specUnchanged=True,
 tests=dict(typescriptUnit=unit['numPassedTests'],rustUnit=6,fullE2E=full,finalClinicalE2E=clinical,finalStrictModeMarquee=marquee,frontAndReleaseBuild='PASS',diffCheck='PASS',
  scope='Full 60-test run precedes the final CompactLabel completion-marker fix; final 25 clinical cases and explicit first-traversal assertion cover the delivered change. Rust/native geometry source unchanged.'),
 implemented=['S2 finite vector neck shared with native silhouette','Independent numerical button-fill press spring; text size unchanged','120ms failure shake and reason','Local swipe ignore and exact-version 4s undo','Session source mute; important source bypass','30 DIP/s finite compact marquee; reduced motion and StrictMode cleanup','Migrated typography/scroll/keyboard/forced-color accessibility tests'],
 native=dict(mode='normal Release, no QA endpoint',measuredExeSHA256=old['src-tauri/target/release/samewave-island.exe'],deliveredExeSHA256=current['src-tauri/target/release/samewave-island.exe'],screen=paint,finalExeConfirmation=read('native-final-confirm/samples.json'),importantPushPreservedFocus=True,
  shadowClick='Observed counter 0 to 1 on owned background at actual shadow location; see native-source-rich screenshot. Later witness instances have separate lifetimes.',sourceObject='DEMO-S03',sourceVersion=1,sourceStateAfterOpen='源系统：待接收',S2AtRest='Observed',dynamicNativeUIA='PARTIAL: stale passive tree observed; focused tree refreshed'),
 performance=read('process-tree.json'),sourceDeltaAfterFullSuite=delta,
 notRun=['Windows 10','Physical 125/150/200% DPI and mixed-DPI/hotplug','120Hz and DWM/ETW presented frames','Complete touch target matrix','Native full keyboard/Narrator speech walkthrough','Native full new swipe gesture sequence','Native CDP rAF/HRGN observation','Windows Focus Assist/external screen-sharing integration'],
 interpretations=['Drag displacement is bounded by retained canvas, at most 128 DIP; no HWND motion','Vector viscous bridge substitutes for full-surface goo filtering','Control fill compresses; text and focus hit target keep size','Each marquee traversal is finite; no infinite hover loop','Privacy/OS protection hides immediately'],approvalBlocks=read('approval-blocks.json'),normalLaunch=read('normal-launch.json'))
(out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
print(json.dumps(dict(tests=report['tests'],specUnchanged=True,sourceDelta=delta,exeSHA256=report['native']['deliveredExeSHA256']),ensure_ascii=False))
