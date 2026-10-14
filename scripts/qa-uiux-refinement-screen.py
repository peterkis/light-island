"""Run the established finite screen witness on a newly owned synthetic QA session.

No user's browser profile or unrelated window is targeted. The temporary opaque
QA background is destroyed on every exit; it never belongs to the application.
"""
from pathlib import Path
import os, json, subprocess

root=Path(__file__).resolve().parents[1]
output=os.environ['ISLAND_QA_OUTPUT']
owner_output=os.environ.get('ISLAND_QA_OWNER_OUTPUT',output)
owner=json.loads((root/owner_output/'ownership.json').read_text(encoding='utf-8-sig'))
assert owner['verified'] and owner['sourcePort']==17323
subprocess.run(['powershell','-NoProfile','-File',str(root/'scripts/optimization-qa.ps1'),'-Action','Verify','-Output',owner_output],cwd=root,check=True)
source=(root/'scripts/qa-motion-witness.py').read_text(encoding='utf8')
source=source.replace('http://127.0.0.1:17322',f"http://127.0.0.1:{owner['sourcePort']}")
source=source.replace("root.title('Clinical Island synthetic witness')","root.title('UIUX refinement synthetic witness')")
# Save a second, narrow raster assertion before the established click/continuity
# probes start. It is an actual desktop composite over a known dark QA surface.
source=source.replace("root.configure(bg='#dbe5e8')","root.configure(bg='#001009')")
# Wait for the collapse to finish; a 400ms screenshot is not resting S0 evidence.
source=source.replace('root.after(400,idle)','root.after(1800,idle)')
source=source.replace("r=rect();report['baseline']=r;click_case", """r=rect();report['baseline']=r
 center=(r[0]+r[2])//2
 assert hit(center,5)==int(h) and hit(left+8,70)==root_h,'QA surface coverage changed'
 image=ImageGrab.grab(bbox=(center-130,0,center+130,70),include_layered_windows=True)
 image.save(out/'native-s0-screen.png')
 white=sum(min(pixel[:3])>150 for pixel in image.getdata())
 report['s0BrightBorderPixels']=white
 assert white==0,'S0 native composite contains an unexpected bright border'
 click_case""")
source=source.replace("finally:\n report['receivedClicks']=clicks", "finally:\n try:root.destroy()\n except tk.TclError:pass\n report['receivedClicks']=clicks")
exec(compile(source,str(root/'scripts/qa-motion-witness.py'),'exec'),{'__file__':str(root/'scripts/qa-motion-witness.py'),'__name__':'__main__'})
