from pathlib import Path
p=Path(__file__).resolve().parents[1]/'tests/motion-restoration.spec.ts'
s=p.read_text(encoding='utf8')
s=s.replace("expect(await button.evaluate(e=>getComputedStyle(e).getPropertyValue('--ux-press').trim())).toBe('');","expect(await island(page).getByRole('button',{name:'暂停计时'}).evaluate(e=>getComputedStyle(e).getPropertyValue('--ux-press').trim())).toBe('');")
p.write_text(s,encoding='utf8')
