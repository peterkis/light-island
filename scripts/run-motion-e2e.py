from pathlib import Path
import os,sys,subprocess,time,json
root=Path(__file__).resolve().parents[1];name=sys.argv[1] if len(sys.argv)>1 else 'full-e2e'
out=root/'evidence/motion-restore-20261013'/name;out.mkdir(parents=True,exist_ok=False)
env={**os.environ,'ISLAND_E2E_EVIDENCE_DIR':str(out)}
command=['cmd','/c','npm run test:e2e'];started=time.perf_counter()
with (out/'command.log').open('wb') as log:r=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT,env=env)
result={'command':command,'exitCode':r.returncode,'seconds':round(time.perf_counter()-started,2),'excluded':[]}
(out/'command.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result),flush=True)
sys.exit(r.returncode)
