"""Reuse the finite synthetic screen witness after checking both owned EXEs."""
from pathlib import Path
import os,json,subprocess
root=Path(__file__).resolve().parents[1]
out=os.environ['ISLAND_QA_OUTPUT']
owner=json.loads((root/out/'ownership.json').read_text(encoding='utf-8-sig'))
subprocess.run(['powershell','-NoProfile','-File',str(root/'scripts/app-split-qa.ps1'),'-Action','Verify','-Output',out],cwd=root,check=True)
source=(root/'scripts/qa-motion-witness.py').read_text(encoding='utf-8')
source=source.replace('http://127.0.0.1:17322',f"http://127.0.0.1:{owner['sourcePort']}")
source=source.replace("root.title('Clinical Island synthetic witness')","root.title('App split synthetic witness')")
source=source.replace("root.configure(bg='#dbe5e8')","root.configure(bg='#001009')")
source=source.replace('root.after(400,idle)','root.after(1800,idle)')
source=source.replace("r=rect();report['baseline']=r;click_case", """r=rect();report['baseline']=r
 center=(r[0]+r[2])//2
 assert hit(center,5)==int(h) and hit(left+8,70)==root_h,'Owned synthetic coverage changed'
 image=ImageGrab.grab(bbox=(center-130,0,center+130,70),include_layered_windows=True)
 image.save(out/'native-s0-screen.png')
 report['s0BrightBorderPixels']=sum(min(pixel[:3])>150 for pixel in image.getdata())
 assert report['s0BrightBorderPixels']==0,'Unexpected bright non-client border'
 click_case""")
source=source.replace("finally:\n report['receivedClicks']=clicks", "finally:\n try:root.destroy()\n except tk.TclError:pass\n report['receivedClicks']=clicks")
exec(compile(source,str(root/'scripts/qa-motion-witness.py'),'exec'),{'__file__':str(root/'scripts/qa-motion-witness.py'),'__name__':'__main__'})
