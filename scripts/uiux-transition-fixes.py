from pathlib import Path
root=Path(__file__).resolve().parent.parent
def edit(path,old,new):
 p=root/path;s=p.read_text(encoding='utf8');assert old in s,(path,old[:100]);p.write_text(s.replace(old,new),encoding='utf8')
edit('src/clinical/useClinicalLayout.ts','let order=0,busy=false,finishing=false,finalizing=false,queued:Shape|null=null,scheduled=false;','let order=0,busy=false,finishing=false,finalizing=false,queued:Shape|null=null,scheduled=false,revealed=false;')
edit('src/clinical/useClinicalLayout.ts','setPresented(requested);body.inert=false;','revealed=true;committedKey.current=contentKey;setPresented(requested);body.inert=false;')
edit('src/clinical/useClinicalLayout.ts','if(closing&&newContent&&!reduced&&!initial)reveal();else if(initial||hidden)reveal(true);','if(initial||hidden)reveal(true);else if(newContent&&!revealed)reveal();')
edit('src/clinical/useClinicalLayout.ts',"if(rest){void settle();return;}raf=requestAnimationFrame(tick);", "if(rest&&(!newContent||now-started>=T.motion.content.delay)){void settle();return;}raf=requestAnimationFrame(tick);")
edit('src/clinical/useClinicalLayout.ts',"curve.path.replace(/^M[^ ]+ L([^ ]+)/,'M$1')", "curve.path.replace(/^M[^ ]+ L([^ ]+)/,'M$1').replace(/ Z$/,'')")
edit('src/clinical/useClinicalLayout.ts','(shape.height-36)/52','(shape.height-37.8)/50.2')
edit('src/clinical/useClinicalLayout.ts','(g.height-36)/52','(g.height-37.8)/50.2')
edit('src/clinical/ClinicalIsland.tsx',"[c.settings.privacy,c.settings.role]);", "[c.settings.privacy,c.settings.role,c.selected]);")
edit('src/clinical/ClinicalIsland.tsx',"${c.settings.role}:${panel}:${c.stale}", "${c.settings.role}:${c.view==='expanded'?panel:'none'}:${c.stale}")
edit('src/clinical/ClinicalStudio.tsx','点击展开 · 悬停不放大','点击展开 · 120ms 悬停微扩')
edit('src/clinical/ClinicalStudio.tsx','恢复 U 型待机。展开与收回沿用旧版轻弹簧节奏，文字不缩放；原生画布保持不动，有限轮廓交接。','数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。')
print('Fixed panel ownership, same-size content reveal and top-rim seam')
