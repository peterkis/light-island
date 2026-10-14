"""Summarize current, separately scoped software/native evidence without promoting device gaps."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil,subprocess

root=Path(__file__).resolve().parents[1]
out=root/'evidence/uiux-refinement-20261013'
def read(path):return json.loads((out/path).read_text(encoding='utf-8-sig'))
unit=read('unit-final.json')
browser=read('complete-e2e/playwright-results.json')['stats']
owner=read('native-final/ownership.json')
visual=read('native-final/visual-native.json')
motion=read('native-final/motion-restored-native-verified.json')
screen=read('native-final/native-click-focus.json')
exe=root/'src-tauri/target/release/samewave-island.exe'
assert hashlib.sha256(exe.read_bytes()).hexdigest()==owner['exeSHA256']
assert unit['numFailedTests']==0 and browser['unexpected']==0 and browser['skipped']==0
assert visual['pass'] and motion['status']=='PASS' and screen['pass'] and screen['s0BrightBorderPixels']==0
checks={'unit':{'passed':unit['numPassedTests'],'total':unit['numTotalTests']},'browser':browser,
        'rust':{'passed':15,'log':'rust-frame-final.log'},'clippy':{'status':'PASS','log':'clippy-frame-final.log'},
        'desktop':{'status':'PASS','log':'desktop-frame-final.log'},'sourceBundle':read('source-bundle.json')}
assert '15 passed; 0 failed' in (out/'rust-frame-final.log').read_text(encoding='utf8')
assert 'Finished' in (out/'clippy-frame-final.log').read_text(encoding='utf8')
assert 'Built application at:' in (out/'desktop-frame-final.log').read_text(encoding='utf8')
inputs=['docs/Windows 灵动岛 UI UX 设计规范 v1.0.md']
lab=json.loads((root/'src/clinical/lab-reader/tokens.json').read_text(encoding='utf8'))
def collect_inputs(value):
 if isinstance(value,dict):
  for child in value.values():collect_inputs(child)
 elif isinstance(value,list):
  for child in value:collect_inputs(child)
 elif isinstance(value,str) and value.startswith('docs/') and value.endswith(('.md','.html')) and value not in inputs:inputs.append(value)
collect_inputs(lab)
immutable={path:hashlib.sha256((root/path).read_bytes()).hexdigest() for path in inputs}
assert immutable[inputs[0]]=='a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa'
for item in lab['source']:assert immutable[item['path']]==item['sha256']
references=out/'user-references';references.mkdir(exist_ok=True)
names=['459e042a-3b50-4b9b-95f2-b4ca1c5e1533','2d70038c-addb-41d5-9743-25320482e93f','50f953f2-2d5d-47b3-888a-1f0e3d1f2c4e']
for i,name in enumerate(names,1):
 source=Path('C:/Users/zqpet/AppData/Local/Temp')/f'codex-clipboard-{name}.png'
 shutil.copyfile(source,references/f'issue-{i}.png')
image=Image.open(references/'issue-1.png').convert('RGB')
mask=Image.new('1',image.size);mask.putdata([p==(219,229,232) for p in image.getdata()])
grey=mask.getbbox()
pixels=Image.open(out/'native-final/native-s0-screen.png').convert('RGB')
expected=Image.open(out/'native-final/idle-webview.png').convert('RGBA')
from PIL import ImageChops
background=Image.new('RGBA',expected.size,(0,16,9,255))
center=expected.width//2
reference=Image.alpha_composite(background,expected).crop((center-130,0,center+130,70)).convert('RGB')
diff=ImageChops.difference(pixels,reference)
raster={'pixelsOver24':sum(max(p)>24 for p in diff.getdata()),'maxChannelError':max(max(p) for p in diff.getdata()),
        'scope':'Actual native desktop composite vs WebView alpha over the known synthetic dark background; 96 DPI resting S0'}
assert raster['pixelsOver24']==0
files=[p for directory in ['src','src-tauri/src','tests','scripts','docs'] for p in (root/directory).rglob('*') if p.is_file()]+[root/'AGENTS.md',root/'README.md',exe]
hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(out/'tested-file-hashes.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2),encoding='utf8')
result={'status':'PASS_IN_RECORDED_SCOPE','gitHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
 'committed':False,'pushed':False,'exe':str(exe),'exeSHA256':owner['exeSHA256'],'immutableInputs':immutable,'checks':checks,
 'issues':{'greyFrame':{'attachmentColour':[219,229,232],'attachmentBounds':grey,'qaWitnessSize':[900,590],'nativeCanvas':screen['baseline'],'temporaryWitnessClosed':True},
           'brightEdges':{'unexpectedBrightPixels':screen['s0BrightBorderPixels'],'alphaComposite':raster},'s0Hover':visual['hover']},
 'native':{'scope':'Fresh owned synthetic QA, Windows 11 / 96 DPI / WebView2; includes full and reduced app modes',
  'screenFrames':len(screen['frames']),'blankFrames':screen['blankFrames'],'realPassThroughClicks':len(screen['receivedClicks']),
  'physicalHWNDRectangles':screen['uniqueRects'],'hwndChanges':motion['hwndChanges'],'regionUpdates':motion['regionUpdates'],
  'restDOMMutations':motion['restDOMMutations'],'restRegionUpdates':motion['restRegionUpdates'],
  'motionTransitions':[{k:v for k,v in t.items() if k!='rows'} for t in motion['transitions']],
  'windowsAnimationsEnabled':motion['platformAfter']['animationsEnabled'],'appPreference':motion['preferenceAfter'],
  'performance':read('native-final/stationary-process-tree.json')},
 'limitations':['rAF cadence is not DWM-presented frames','Physical mixed DPI/multi-monitor/120Hz/Narrator/touch/Windows10 NOT_RUN',
  'Curve and shadow remain documented mathematical approximations','Synthetic/read-only prototype; no real clinical delivery acceptance'],
 'preservedFailures':['native-red','browser-red','full-e2e.log (CustomEase parse failure, interrupted)',
  'ease-fixed (new Compact fixture)','visual-matrix (new Minimal fixture)','desktop.log (old EXE lock)',
  'native/screen.log','native/screen-settled.log','screen-no-blur','screen-redraw','screen-alpha'],
 'nativeCleanup':read('native-final/cleanup.json'),'normalReview':read('normal-launch.json')}
(out/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:result[k] for k in ['status','exeSHA256','issues']},ensure_ascii=False,indent=2))
