"""Check the recorded fault chain, not just the final 170x37 surface."""
import json
from pathlib import Path
folder = Path(__file__).resolve().parent.parent / 'evidence/hover-fix-20260930'
report = json.loads((folder / 'after-native.json').read_text(encoding='utf-8'))
def identity(c): return (c['engine'], c['shape'], c['reduced'], c['side'])
selected = {identity(c): dict(c, sample='after-native.json') for c in report['cases']}
for recording in sorted(folder.glob('after-native-repeat*.json')):
    repeat = json.loads(recording.read_text(encoding='utf-8'))
    report['errors'].extend(repeat['errors'])
    for case in repeat['cases']:
        assert identity(case) in selected, 'Unexpected replacement case'
        selected[identity(case)] = dict(case, sample=recording.name)
report['cases'] = list(selected.values())
rows = []
for case in report['cases']:
    end_hold = case['hold'][-1]['at']
    events = case['events']
    entry = [e for e in events if e['kind'] == 'motion-start' and e['at'] <= end_hold]
    exits = [e for e in events if e['kind'] == 'motion-start' and e['at'] > end_hold]
    false_inside = [e for e in events if e['kind'] == 'hover-state' and e.get('value') is False and e['at'] <= end_hold]
    leaves = [e for e in events if e['kind'] == 'leave-accepted' and e['at'] > end_hold]
    stable_focus = all(e['foreground'] == case['before']['foreground'] for e in case['hold'])
    expected_epochs = 0 if case['reduced'] else 1
    row = {k: case[k] for k in ['engine', 'shape', 'reduced', 'side', 'sample']}
    row.update(entryEpochs=len(entry), exitEpochs=len(exits), falseInside=len(false_inside), acceptedLeaves=len(leaves), focusPreserved=stable_focus, moves=case['windowMoves'])
    row['pass'] = case['pass'] and len(entry) == expected_epochs and len(exits) == expected_epochs and not false_inside and len(leaves) == 1 and stable_focus and case['before']['rect'] == case['after']['rect']
    rows.append(row)
result = {'cases': rows, 'passed': sum(r['pass'] for r in rows), 'total': len(rows), 'runtimeErrors': report['errors']}
(folder / 'native-hover-audit.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result, indent=2))
assert rows and all(row['pass'] for row in rows) and not report['errors'], 'Inspect raw evidence; hover-chain acceptance failed'
