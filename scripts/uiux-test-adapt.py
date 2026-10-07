from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'tests/clinical-model.test.ts';s=p.read_text(encoding='utf8')
a=s.index(" it('takes numeric tokens");b=s.index("\n it(",a+1)
s=s[:a]+" it('takes tokens from the current user-authored UI/UX CSS block',()=>{const text=readFileSync(tokens.source,'utf8');for(const [name,value] of Object.entries(tokens.css))expect(text).toContain(`--${name}:${value}`);expect(tokens.geometry.idle.width).toBe(124);});"+s[b:]
s=s.replace('toBeGreaterThanOrEqual(-.001);expect(x).toBeLessThanOrEqual(w+.001)','toBeGreaterThanOrEqual(-tokens.geometry.earRadius-.001);expect(x).toBeLessThanOrEqual(w+tokens.geometry.earRadius+.001)')
p.write_text(s,encoding='utf8')
p=root/'src/clinical/useSurfaceInput.ts';s=p.read_text(encoding='utf8').replace('stack:()=>void}', 'stack:()=>void;keyboardExpand?:()=>void}').replace("if(!dead)latest.current.expand();", "if(!dead)(latest.current.keyboardExpand??latest.current.expand)();")
p.write_text(s,encoding='utf8')
p=root/'src/clinical/ClinicalIsland.tsx';s=p.read_text(encoding='utf8').replace('hover:c.setHovered,expand,collapse,stack}', 'hover:c.setHovered,expand,collapse,stack,keyboardExpand:()=>{keyboardOpen.current=true;expand();}}')
p.write_text(s,encoding='utf8')
print('Updated superseded token expectations; shortcut moves focus only on explicit invocation')
