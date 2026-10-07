from pathlib import Path
root=Path(__file__).resolve().parent.parent
# Drop the optional feedback hook: its write was blocked and it was never installed.
p=root/'scripts/uiux-behavior-complete.py'
s=p.read_text(encoding='utf8').replace("\\nimport {useMicroFeedback} from './useMicroFeedback';",'').replace(' useMicroFeedback(mainRef,reduced,c.route);\\n','')
p.write_text(s,encoding='utf8')
exec(compile(s,str(p),'exec'))
p=root/'src/clinical/uiux.css'
s=p.read_text(encoding='utf8')
s+='''
/* Explicit button states; no additional event-capture helper. */
.ux-host .ci-primary:active:not(:disabled),.ux-host .ci-secondary:active:not(:disabled),.ux-host .ci-icon-button:active:not(:disabled),.ux-host .ux-round:active:not(:disabled){transform:scale(.94);transition:transform 80ms}
.ux-host .ux-compact-button{grid-template-columns:40px 124px minmax(0,1fr)}
.ux-host .has-label{grid-template-columns:24px minmax(0,1fr) 40px}
.ux-host .ux-quiet-actions{flex-wrap:wrap}.ux-quiet-actions button{min-width:90px}
.ux-host .ux-overflow{position:absolute;left:16px;right:16px;bottom:4px;font-size:11px;line-height:14px;color:var(--c-text-2);background:#000}
.ux-timer-finished{animation:ux-finish 600ms linear 2}
@keyframes ux-finish{0%,100%{opacity:1}50%{opacity:.3}}
.ci-reduced .ux-timer-finished{animation:none}
.ci-reduced button:active{transform:none!important;transition:none!important}
'''
p.write_text(s,encoding='utf8')
print('Behavior completed; optional blocked hook not introduced')
