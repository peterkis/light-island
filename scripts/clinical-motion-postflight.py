from pathlib import Path
import json,hashlib,zipfile,subprocess
root=Path(__file__).resolve().parent.parent;out=root/'evidence/clinical-motion-20261004'
summary=json.loads((out/'RESULTS.json').read_text(encoding='utf8'))
# Code verified by the serial run must be exactly what is delivered.
expected=json.loads((out/'verified-source.json').read_text(encoding='utf8'))
assert not [name for name,digest in expected.items() if hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest]
token_paths=[root/'src/clinical/tokens.json',root/'src/clinical/tokens.css']
before={str(p):p.stat().st_mtime_ns for p in token_paths}
subprocess.run(['node','scripts/generate-clinical-tokens.mjs'],cwd=root,check=True)
subprocess.run(['node','scripts/generate-clinical-tokens.mjs'],cwd=root,check=True)
assert before=={str(p):p.stat().st_mtime_ns for p in token_paths},'Unchanged token generation unexpectedly rewrote files'
(out/'token-idempotence.json').write_text(json.dumps({'pass':True,'mtimeUnchanged':True},indent=2),encoding='utf8')
# Archive this turn's one-shot editing helpers only. Never clean incoming uncommitted files.
baseline=json.loads((out/'baseline.json').read_text(encoding='utf8'))['files']
helpers=['patch-clinical-native-motion.py','clinical-layout-command.rs','update-clinical-presentation.py','update-clinical-geometry-tests.py','update-clinical-motion-docs.py','clinical-motion-followthrough.py','sync-clinical-motion-contracts.py','finalize-clinical-motion-docs.py','inspect-clinical-test-reload.py','fix-clinical-svg-owner.py']
with zipfile.ZipFile(out/'implementation-helpers.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in helpers:
  p=root/'scripts'/name
  if p.exists() and str(p.relative_to(root)) not in baseline:
   z.write(p,p.relative_to(root));p.unlink()
frames=summary['screenFrames'];fps=summary['frameCadence']['averageFps'];p95=summary['frameCadence']['p95ms']
p=root/'docs/CLINICAL-MOTION-RESTORE.md'
s=p.read_text(encoding='utf8')+f'''\n## 最终验证（本轮代码）\n\nTypeScript 类型检查、前端构建与 Windows Release 构建 PASS；157/157 单元测试、6/6 Rust 测试、52/52 E2E 全部 PASS。原生 22 次实际打开/收回转换有连续中间尺寸，HWND 几何变化为0；3个稳定状态抗锯齿截断均为0，200%/225%真实渲染字体与来源按钮可达性 PASS。原生准确对象来源窗口、写入拒绝、过期提交拒绝与中断收敛均 PASS。\n\n两轮 Windows 合成背景实际截图共 {frames} 帧，未捕获空白；6次背景真实点击全部收到，普通/重要动态不抢焦点。6秒 rAF 采样约 {fps:.2f}fps，P95 {p95:.1f}ms，不能当作 DWM 全帧呈现保证。空闲DOM更新为0。原生测试为 Windows11/96DPI，未替代其他OS/DPI/Narrator/生产接口验收。\n\n初次全量测试与重复生成 tokens 并行时出现 Vite 重载，导致1项定位超时；trace已保留，并通过“未变token不重写”和串行执行修正，最终52项均在相同代码上重跑。原生初版屏幕采样捕获3处收回缩错：React先写目标SVG尺寸、旧path尚未交接。已改为单动效owner，并加入SVG尺寸/当前外壳一致性断言；保留修复前证据，不拿FPS掩盖问题。\n\n最终数据：`evidence/clinical-motion-20261004/RESULTS.json`、`verified-commands.json`、`motion-native.json`、`windows-1.json`、`windows-2.json`。远端Figma仍受Starter额度限制，本轮不声称已重新目视核验或修改Figma。\n'''
p.write_text(s,encoding='utf8')
print('Unchanged tokens verified; this-turn temporary helpers archived; final validation documented')
