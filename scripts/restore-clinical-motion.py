"""Scoped continuation: preserve the complete incoming worktree before the U-notch/motion fix."""
from pathlib import Path
import json,re,zipfile,subprocess,hashlib,datetime
root=Path(__file__).resolve().parent.parent
out=root/'evidence/clinical-motion-20261004';out.mkdir(exist_ok=True,parents=True)
backup=root/'evidence/backups/before-clinical-motion-20261004.zip';backup.parent.mkdir(exist_ok=True,parents=True)
if backup.exists():raise SystemExit('Backup already exists; refusing to replace the incoming baseline')
paths=[]
for folder in ['src','src-tauri/src','src-tauri/capabilities','tests','docs','scripts','server']:
 paths += [p for p in (root/folder).rglob('*') if p.is_file()]
paths += [p for p in root.iterdir() if p.is_file() and p.suffix in ['.json','.ts','.md','.html']]
with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
 for p in set(paths):z.write(p,p.relative_to(root))
baseline={'time':datetime.datetime.now().astimezone().isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'status':subprocess.check_output(['git','status','--short'],cwd=root,text=True),'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in set(paths)}}
(out/'baseline.json').write_text(json.dumps(baseline,indent=2),encoding='utf8')
# Restore the previously accepted cubic contour, including inverse ears inside total width.
p=root/'src/clinical/geometry.ts';old=p.read_text(encoding='utf8')
legacy=(root/'src/lib/geometry.ts').read_text(encoding='utf8')
curve=legacy[legacy.index('export type Point ='):legacy.index('/** Mildly underdamped')]
curve=curve.replace('silhouette(g: Geometry)','contour(g: Shape)')
old=old[:old.index('/** Body width excludes ears')]+curve
old=old.replace('available-2*g.earRadius-2*g.viewportMargin','available-2*g.viewportMargin')
old+='''\n/** Width-only response uses the accepted legacy spring; height never overshoots. */
export function clinicalSpring(t:number):number {
 if(t<=0)return 0;if(t>=1)return 1;
 const {dampingRatio:zeta,angularFrequency:omega}=T.motion.expand.spring;
 const q=Math.sqrt(1-zeta*zeta);
 const response=(x:number)=>1-Math.exp(-zeta*omega*x)*(Math.cos(omega*q*x)+zeta/q*Math.sin(omega*q*x));
 return response(t)/response(1);
}
export function motionShape(g:Shape):Shape {return {width:g.width,height:g.height,radius:g.radius,ear:g.ear};}
'''
p.write_text(old,encoding='utf8')
# Edit only the authoritative token block; numeric consumers are generated afterwards.
p=root/'docs/Dynamic-Island-UI-Spec.md';text=p.read_text(encoding='utf8');match=re.search(r'```json\s*\n([\s\S]*?)\n```',text);assert match
v=json.loads(match[1]);v['schemaVersion']='1.1.0';g=v['geometry'];g['earRadius']=7;g['idle']['width']=160;g['contour']='legacy-u-cubic-ears-inside-total-width';g['pixelBoundaryTolerance']=2
v['motion']['expand'].update(total=565,shellDuration=540,shellDelay=25,shellEase='clinical-legacy-spring',contentDelay=60,contentDuration=180,contentTranslateY=0,contentTranslateX=4,contentScaleFrom=1,heightEase='power3.out',spring={'dampingRatio':0.84,'angularFrequency':13,'maxWidthOvershootRatio':0.01})
v['motion']['collapse'].update(total=410,contentDuration=55,shellDelay=70,shellDuration=340,shellEase='power3.out')
v['motion']['handoff']={'exitDuration':55,'finalPaintFrames':2,'occludedFinalizeTimeout':100,'watchdogTimeout':1500,'maxInFlight':1}
v['validation']['nativeGeometryMutationsPerNormalTransitionMax']=0
v['validation']['nativeOutlinePolicy']='finite-motion-only-coalesced-previous-next-union'
v['validation']['performanceStatus']='requires-current-native-validation'
text=text[:match.start(1)]+json.dumps(v,ensure_ascii=False,indent=2)+text[match.end(1):]
p.write_text(text,encoding='utf8')
p=root/'scripts/generate-clinical-tokens.mjs';s=p.read_text(encoding='utf8').replace("tokens.schemaVersion!=='1.0.0'","tokens.schemaVersion!=='1.1.0'")
p.write_text(s,encoding='utf8')
print('Incoming worktree preserved; cubic U silhouette and authoritative motion tokens restored',flush=True)
