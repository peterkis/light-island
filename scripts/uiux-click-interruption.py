from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/clinical/ClinicalIsland.tsx';s=p.read_text(encoding='utf8')
old='onMouseEnter={input.enter} onMouseLeave={input.leave} onPointerDown={input.down} onPointerUp={input.up}'
new=old+'\n   onClick={e=>{if((e.target as Element).matches(\'[data-shell="fill"]\')&&!input.consumeLong())expand();}}'
assert old in s;s=s.replace(old,new)
p.write_text(s,encoding='utf8')
print('The stable visible shell remains actionable while outgoing content is inert')
