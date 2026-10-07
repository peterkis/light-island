from pathlib import Path
root = Path(__file__).resolve().parent.parent
p = root / 'src/clinical/controller.ts'
s = p.read_text(encoding='utf8')
s = s.replace('useRef({queue,settings,selected,view,connection});latest.current={queue,settings,selected,view,connection};', 'useRef({queue,settings,selected,view,connection,followed});latest.current={queue,settings,selected,view,connection,followed};')
s = s.replace("else if(a.priority==='important'||!current.settings.quiet)", "else if(a.priority==='important'||(!current.settings.quiet&&current.followed[key]!==false))")
s = s.replace(' const choose=(id:string)=>', ''' useEffect(()=>{
  const syncedAt=selectedActivity?.syncedAt;if(!syncedAt)return;
  const left=syncedAt+1800000-Date.now();if(left<=0)return;
  const timeout=window.setTimeout(()=>setNow(Date.now()),left+1);
  return()=>clearTimeout(timeout);
 },[selectedActivity?.syncedAt]);
 const choose=(id:string)=>''')
p.write_text(s, encoding='utf8')
p = root / 'src/clinical/model.ts'
s = p.read_text(encoding='utf8').replace('return identityKey(a.identity)===identityKey(identity)&&a.version===version;', "return Boolean(identity&&['source','campus','encounter','object'].every(k=>typeof identity[k as keyof Identity]==='string')&&identityKey(a.identity)===identityKey(identity)&&a.version===version);")
p.write_text(s, encoding='utf8')
print('Personal watch now suppresses only routine preview; source object remains intact. Invalid route identities fail closed.')
