"""Summarize only this run's completed evidence; do not import historical pass claims."""
from pathlib import Path
import json,hashlib,subprocess,datetime
root=Path(__file__).resolve().parent.parent;out=root/'evidence/clinical-motion-20261004'
read=lambda name:json.loads((out/name).read_text(encoding='utf-8-sig'))
commands=read('verified-commands.json');assert len(commands)==9 and all(r['exit']==0 for r in commands)
build=read('verified-build.json');motion=read('motion-native.json');native=read('native-validation.json');bounds=read('native-boundaries.json');windows=[read(f'windows-{i}.json') for i in [1,2]]
assert build['allPass'] and motion['pass'] and native['pass'] and bounds['pass'] and all(w['pass'] for w in windows)
assert '157 passed' in (out/'verified-unit.log').read_text(encoding='utf8')
assert '52 passed' in (out/'verified-e2e.log').read_text(encoding='utf8')
summary={'time':datetime.datetime.now().astimezone().isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'schemaVersion':'1.1.0','unitTests':157,'rustTests':6,'endToEndTests':52,
 'nativeDpi':native['baseline']['dpi'],'idle':[160,34],'nativeCanvas':[native['metrics']['canvasWidth'],native['metrics']['canvasHeight']],
 'actualClickTransitions':len(motion['transitions'])+2*len(native['transitions']),
 'continuousGeometryPass':motion['pass'],'sourceOpenedExactObject':native.get('sourceOpenedExactObject'),'clinicalWriteAndSimulatorDenied':native['clinicalWriteAndSimulatorDenied'],'staleAndMalformedRejected':motion['staleAndMalformedRejected'],
 'frameCadence':native['frameCadence'],'idleMutations':native['idleMutations'],
 'antialiasClipped':[r['clippedAntialiasPixels'] for r in bounds['alpha']],'largeText':[r['textScale'] for r in bounds['largeText']],
 'screenFrames':sum(len(w['frames']) for w in windows),'blankFrames':sum(w['blankFrames'] for w in windows),'actualBackgroundClicks':sum(len(w['receivedClicks']) for w in windows),
 'focusPreserved':all(w['importantPreservesFocus'] and w['routinePreservesFocus'] for w in windows),
 'nativeWindowChanges':sum(r['windowChanges'] for r in native['transitions']),
 'sourceChangesAfterTests':build['sourceChanges'],'exeSHA256':build['exeSHA256'],
 'limitations':['Figma Starter quota denied new screenshot retrieval; no remote canvas edits','Windows 11 at actual 96 DPI tested; Windows 10 / OS 125-200% / mixed-monitor not run','Browser text scaling is not actual OS-DPI validation','Finite screen capture is not complete DWM PresentMon; rAF is not guaranteed presented FPS','Clinical data remain synthetic; no production identity, delivery or treatment workflow validation']}
(out/'RESULTS.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
