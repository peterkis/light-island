from pathlib import Path
p=Path(__file__).resolve().parents[1]/'scripts/qa-motion-restored-native.mjs'
s=p.read_text(encoding='utf8')
s=s.replace("probe({op:'move',...point,steps:16,delay:.02});await page.waitForTimeout(1300);","const arrived=probe({op:'move',...point,steps:16,delay:.02});await page.waitForTimeout(1300);")
s=s.replace("r.cursor[0]===point.x&&r.cursor[1]===point.y","r.cursor[0]===arrived.cursor[0]&&r.cursor[1]===arrived.cursor[1]")
s=s.replace("{side,point,samples:holds.length","{side,point,actualCursor:arrived.cursor,samples:holds.length")
p.write_text(s,encoding='utf8')
print('Native stationary-input check uses actual arrival pixels, preserving OS absolute-input quantization')
