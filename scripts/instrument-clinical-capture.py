from pathlib import Path
p=Path(__file__).resolve().parent.parent/'scripts/qa-clinical-windows.py'
s=p.read_text(encoding='utf8')
s=s.replace("  'centerPainted':", "  'centerPainted':")
needle=" if len(report['frames']) in [1,14,36,60]:image.save(out/f'native-screen-{len(report[\"frames\"]):03}.png')"
assert needle in s
replacement=needle+"\n if not report['frames'][-1]['centerPainted']:\n  report['frames'][-1]['centerPixel']=list(image.getpixel((width//2,5)))\n  image.save(out/f'native-gap-{len(report[\"frames\"]):03}.png')"
s=s.replace(needle,replacement)
p.write_text(s,encoding='utf8')
print('Capture retains every detected gap image instead of relying on one sampled pixel alone.')
