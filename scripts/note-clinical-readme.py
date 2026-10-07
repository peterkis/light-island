from pathlib import Path
p=Path(__file__).resolve().parent.parent/'README.md'
s=p.read_text(encoding='utf8')
head,rest=s.split('\n',1)
note='''

> **当前默认入口（2026-10-04）：临床协作原型。** 根据 `docs/prd` 三份文档与新 UI 规范实现个人番茄钟、8 个核心来源场景和 6 个研究扩展场景。临床状态只读，来源按钮打开经过对象/版本校验的本机模拟来源窗口，不写临床确认。
>
> 双击 `start-prototype.cmd`；开发使用 `npm run dev:clinical` 后打开本机 `http://127.0.0.1:1420/clinical.html`。临床模拟源为 17322，原有 17321 旧版源保留。`--legacy --studio` 可运行旧版对照，但需先退出当前单实例客户端。
>
> 实现、原生动效安全降级及未验收边界见 [CLINICAL-IMPLEMENTATION](docs/CLINICAL-IMPLEMENTATION.md)；本轮真实命令和证据在 `evidence/clinical-20261004/`。以下旧版说明保留作历史参考，不代表新临床模式仍有“确认收到”操作。
'''
assert '当前默认入口（2026-10-04）' not in s
p.write_text(head+note+rest,encoding='utf8')
print('README default entry updated; historical implementation retained.')
