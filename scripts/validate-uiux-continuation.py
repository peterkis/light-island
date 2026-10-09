"""Current verification without overwriting frozen historical evidence."""
from pathlib import Path
import datetime, hashlib, json, os, shutil, subprocess, time

root = Path(__file__).resolve().parent.parent
out = root / 'evidence/uiux-continuation-20261008'
out.mkdir(parents=True, exist_ok=True)
tracked = subprocess.check_output(['git', 'ls-files', '-z', 'evidence'], cwd=root).decode().split('\0')
original = {p: (root/p).read_bytes() for p in tracked if p and (root/p).is_file()}
commands = ['npm.cmd run build', 'npm.cmd test -- --reporter=json --outputFile=evidence/uiux-continuation-20261008/final-unit.json',
            'cargo test --manifest-path src-tauri/Cargo.toml', 'npm.cmd run test:e2e', 'npm.cmd run desktop:build']
environment = dict(os.environ, PLAYWRIGHT_JSON_OUTPUT_FILE=str(out/'final-e2e.json'))
results = []
try:
    for i, command in enumerate(commands):
        print(f'VALIDATING {command}', flush=True)
        start = time.monotonic()
        with (out/f'command-{i}.log').open('w', encoding='utf8') as log:
            result = subprocess.run([os.environ.get('ComSpec', 'cmd.exe'), '/d', '/c', command], cwd=root, env=environment, stdout=log, stderr=subprocess.STDOUT)
        results.append(dict(command=command, exitCode=result.returncode, seconds=round(time.monotonic()-start, 2)))
        print(json.dumps(results[-1]), flush=True)
        if result.returncode:
            break
finally:
    restored = []
    for name, content in original.items():
        file = root/name
        if file.exists() and file.read_bytes() != content:
            generated = out/'historical-generated'/Path(name).relative_to('evidence')
            generated.parent.mkdir(parents=True, exist_ok=True)
            generated.write_bytes(file.read_bytes())
            file.write_bytes(content)
            restored.append(name)
    report = dict(at=datetime.datetime.now().astimezone().isoformat(), commands=results, historicalEvidenceRestored=restored)
    (out/'commands.json').write_text(json.dumps(report, indent=2), encoding='utf8')
if len(results) == len(commands) and all(x['exitCode'] == 0 for x in results):
    files = [p for directory in ['src', 'src-tauri/src', 'server', 'tests'] for p in (root/directory).rglob('*') if p.is_file()]
    files += [root/'src-tauri/target/release/samewave-island.exe', root/'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md', root/'package-lock.json', root/'src-tauri/Cargo.lock']
    hashes = {str(p.relative_to(root)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    (out/'tested-hashes.json').write_text(json.dumps(hashes, indent=2), encoding='utf8')
    print('ALL CURRENT COMMANDS PASSED; tested source and EXE hashes recorded', flush=True)
else:
    raise SystemExit(1)
