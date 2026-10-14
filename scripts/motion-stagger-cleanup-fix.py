from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/clinical/useClinicalLayout.ts'
s=p.read_text(encoding='utf8')
old='  const reveal=(immediate=false)=>{'
assert s.count(old)==1
s=s.replace(old,"""  // kill() stops a timeline but does not restore inline styles. A reduced-mode
  // switch or same-content reversal must not strand a partially revealed child.
  const clearOwnedChildMotion=()=>{
   const children=body.querySelectorAll<HTMLElement>('[data-stagger],[data-lab-i]');
   if(children.length)gsap.set(children,{clearProps:'opacity,transform'});
  };
  const reveal=(immediate=false)=>{""")
old='   fade?.kill();\n   if(immediate)'
assert s.count(old)==1
s=s.replace(old,'   fade?.kill();\n   if(immediate||reduced)clearOwnedChildMotion();\n   if(immediate)')
old="}else{body.inert=false;body.style.opacity='1';body.style.filter='none';body.style.transform='none';}"
assert s.count(old)==1
s=s.replace(old,"}else{clearOwnedChildMotion();body.inert=false;body.style.opacity='1';body.style.filter='none';body.style.transform='none';}")
p.write_text(s,encoding='utf8')
print('Fixed reproduced interrupted-stagger opacity 0.3415; only animation-owned styles reset, no source or geometry changes')
