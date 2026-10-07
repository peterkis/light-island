"""Collect recorded results; do not convert incomplete or failed gates to PASS."""
from pathlib import Path
import json,subprocess,hashlib,datetime,re
root=Path(__file__).resolve().parent.parent;out=root/'evidence/clinical-20261004'
def load(name):return json.loads((out/name).read_text(encoding='utf-8-sig'))
build=load('final-build-commands.json');e2e=load('final-e2e-command.json');native=load('delivery-native-commands.json')
assert all(r['exit']==0 for r in build) and e2e['exit']==0 and len(native)==5 and all(r['exit']==0 for r in native)
boundaries=load('native-boundaries.json');interaction=load('native-validation.json');windows=[load(f'windows-{i}.json') for i in range(1,4)]
assert boundaries['pass'] and interaction['pass'] and all(r['pass'] for r in windows)
assert interaction['sourceOpenedExactObject'] is True
hashes=load('tested-source-hashes.json');changed=[name for name,h in hashes.items() if hashlib.sha256((root/name).read_bytes()).hexdigest()!=h];assert not changed,changed
baseline=load('baseline.json');document_changes=[name for name,h in baseline['sourceHashes'].items() if name.startswith('docs/') and (root/name).exists() and hashlib.sha256((root/name).read_bytes()).hexdigest()!=h]
assert not document_changes,document_changes
catalogue=json.loads((root/'src/clinical/catalogue.json').read_text(encoding='utf8'))
plain=lambda text:re.sub(r'\x1b\[[0-9;]*m','',text)
unit=plain((out/'final-unit.log').read_text(encoding='utf8'));test_count=int(re.search(r'Tests\s+(\d+) passed',unit).group(1))
e2e_count=int(re.search(r'(\d+) passed \(',plain((out/'final-e2e.log').read_text(encoding='utf8'))).group(1))
rust_count=int(re.search(r'test result: ok\. (\d+) passed',plain((out/'final-rust.log').read_text(encoding='utf8'))).group(1))
exe=root/'src-tauri/target/release/samewave-island.exe'
result={'recordedAt':datetime.datetime.now().astimezone().isoformat(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=root,text=True).strip(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'coreScenarios':9,'researchExtensions':6,'readOnlySourceScenarios':len(catalogue),'sourceStoryboardStates':sum(len(s['stages']) for s in catalogue),'tests':{'types':'PASS','frontendAndDesktopBuild':'PASS','unit':test_count,'rust':rust_count,'e2e':e2e_count},'native':{'physicalOpenCloseCycles':len(interaction['transitions']),'physicalWindowChanges':sum(r['windowChanges'] for r in interaction['transitions']),'regionChangesPerOpenCloseCycle':[r['regionChanges'] for r in interaction['transitions']],'exactSourceWindow':interaction['sourceOpenedExactObject'],'clinicalWritesRejected':interaction['clinicalWriteAndSimulatorDenied'],'alphaChecks':len(boundaries['alpha']),'clippedAlphaPixels':sum(r['clippedAntialiasPixels'] for r in boundaries['alpha']),'largeText':boundaries['largeText'],'clickThroughRuns':len(windows),'backgroundClicks':sum(len(r['receivedClicks']) for r in windows),'screenSamples':sum(len(r['frames']) for r in windows),'blankSamples':sum(r['blankFrames'] for r in windows),'sourceFocusPreserved':all(r['importantPreservesFocus'] and r['routinePreservesFocus'] for r in windows),'idleMutations':interaction['idleMutations'],'rafCadence':interaction['frameCadence']},'sourceChangesAfterBuildTests':changed,'inputDocumentChanges':document_changes,'exeSHA256':hashlib.sha256(exe.read_bytes()).hexdigest(),'exeBytes':exe.stat().st_size,'notRun':['Online Figma layer/pixel audit: Starter MCP quota exhausted','Native continuous geometry morph: explicit safe fallback selected','Windows 10 and actual OS DPI 125/150/200/mixed monitors','Real lock/fullscreen/screenshare hooks; only explicit simulator switches','Hospital authentication, current-HIS-patient context, source interfaces, clinical delivery and completion','NVDA human audit and clinical-user comprehension testing','Complete DWM presented-frame tracing']}
(out/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False,indent=2))
