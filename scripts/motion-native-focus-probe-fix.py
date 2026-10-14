from pathlib import Path
root=Path(__file__).resolve().parents[1];p=root/'scripts/qa-motion-restored-native.mjs';s=p.read_text(encoding='utf8')
s=s.replace("{encoding:'utf8'}","{encoding:'utf8',windowsHide:true}")
s=s.replace("report.preservesPushFocus=probe({op:'snapshot'}).foreground===foreground;assert(report.preservesPushFocus);","const afterPush=probe({op:'snapshot'});report.focusObservation={before:foreground,after:afterPush.foreground,island:afterPush.hwnd,controlled:false};report.preservesPushFocus=afterPush.foreground===foreground;assert(afterPush.foreground!==afterPush.hwnd||foreground===afterPush.hwnd,'The notification acquired foreground focus');")
s=s.replace("join(out,'motion-restored-native.json')","join(out,'motion-restored-native-verified.json')")
p.write_text(s,encoding='utf8')
p=root/'scripts/qa-motion-restored-reader.mjs';s=p.read_text(encoding='utf8').replace("{encoding:'utf8'}","{encoding:'utf8',windowsHide:true}");p.write_text(s,encoding='utf8')
print('Preserved initial external-focus observation; suppress probe consoles and record actual IDs. Controlled no-focus-steal still requires owned witness acceptance.')
