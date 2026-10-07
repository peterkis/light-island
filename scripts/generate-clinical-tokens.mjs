// Extract the user's UI/UX CSS tokens. The original specification is never modified.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sourcePath='docs/Windows 灵动岛 UI UX 设计规范 v1.0.md';
const source=await readFile(sourcePath,'utf8');
const start=source.indexOf('## 12. Design Token'),end=source.indexOf('## 13.',start);
if(start<0||end<0)throw new Error('UI/UX Design Token section not found');
const block=source.slice(start,end).match(/:root\{([\s\S]*?)\}/)?.[1];
if(!block)throw new Error('CSS token block missing');
const variables=Object.fromEntries([...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const n=name=>{const v=parseFloat(variables[name]);if(!Number.isFinite(v))throw Error(`Missing numeric token ${name}`);return v;};
const color=name=>{if(!variables[name])throw Error(`Missing token ${name}`);return variables[name];};
const spring=name=>{const [k,c]=color(`spring-${name}`).split(',').map(Number);return {k,c};};
const font=(name,letterSpacing=0)=>{const m=color(`t-${name}`).match(/^(\d+) (\d+)px\/(\d+)px/);if(!m)throw Error(`Invalid typography ${name}`);return {weight:+m[1],size:+m[2],lineHeight:+m[3],letterSpacing};};
// Adapter names retain the source/model boundary. Implementation interpretations are documented.
const tokens={schemaVersion:'uiux-1.0',source:sourcePath,sourceSHA256:createHash('sha256').update(source).digest('hex'),css:variables,
 geometry:{anchor:'primary-monitor-top-center',earRadius:n('ear'),idle:{width:n('island-idle-w'),height:n('island-idle-h'),bottomRadius:n('r-idle')},
 compact:{width:268,minWidth:200,minHeight:n('island-compact-h'),bottomRadius:n('r-compact'),paddingX:12,paddingY:6,centerBlank:124},
 expanded:{baseWidth:n('island-rich-w'),preferredMaxWidth:560,widthGrowthPerTextScale:160,simpleMinHeight:n('island-alert-h'),richMinHeight:n('island-rich-h'),maxViewportHeightRatio:.3,preferredMaxHeight:280,bottomRadius:n('r-rich'),paddingX:20,paddingY:18},
 alert:{width:n('island-alert-w'),height:n('island-alert-h'),radius:n('r-alert')},stack:{width:n('island-stack-w'),height:280,radius:n('r-stack')},minimal:n('island-minimal'),floatTop:n('float-top'),viewportMargin:16,pixelBoundaryTolerance:2,smoothing:.6},
 space:{s0:0,s1:n('s-1'),s2:n('s-2'),s3:n('s-3'),s4:n('s-4'),s5:n('s-5'),s6:n('s-6'),s7:32},
 layout:{iconTextGap:12,textStackGap:4,sectionGap:12,controlGap:12,headerCloseColumn:32,progressThickness:4,primaryActionMaxCount:2,compactTextLines:1,expandedBodyPreviewLines:2},
 type:{fontFamily:color('font'),displayFamily:'"Segoe UI Variable Display", "Segoe UI", "Microsoft YaHei UI", sans-serif',numericVariant:'tabular-nums lining-nums',title:font('title',-.2),titleLarge:font('title-l',-.3),body:font('body'),compact:{size:13,lineHeight:16,weight:600,letterSpacing:0},caption:font('caption',.1),button:font('body-strong'),digit:font('hero',-.4)},
 color:{surface:color('c-island'),surfaceRaised:color('c-card'),surfaceHover:color('c-card-hover'),surfacePressed:color('c-fill-press'),textPrimary:color('c-text'),textSecondary:color('c-text-2'),textTertiary:color('c-text-3'),decorationMuted:color('c-separator'),rimDecorative:color('c-hairline'),focusRing:'rgba(255,255,255,.8)',statusSuccess:color('c-green'),statusWarning:color('c-yellow'),statusInfo:color('c-blue'),statusError:color('c-red'),progressTrack:'rgba(255,255,255,.18)',progressFill:color('c-text'),control:color('c-fill'),controlHover:color('c-fill-hover')},
 material:{mode:'opaque',backdropBlur:0,rimWidth:.5,shadow:color('shadow-expanded'),shadowInset:48},
 icon:{compactGlyph:16,compactBox:24,expandedArt:52,artRadius:11.6324,controlGlyph:20,stroke:1.75},
 control:{minPointerTarget:32,preferredTouchTarget:44,buttonMinHeight:32,buttonPaddingX:14,focusRingWidth:2,focusRingInset:2},
 motion:{spring:{expand:spring('expand'),collapse:spring('collapse'),morph:spring('morph'),press:spring('press'),peek:spring('peek'),height:{k:210,c:23}},
 content:{exit:n('dur-fast'),enter:n('dur-slow'),base:n('dur-base'),delay:90,stagger:40,enterBlur:12,exitBlur:6,exitCollapseBlur:8,translateY:8,scale:.96},
 hover:{delay:120,factor:1.05,leaveDelay:80},press:{factor:.97,buttonFactor:.94,duration:80},collapse:{delay:40},reduced:{duration:150},
 integrator:{maxFrameDelta:1/30,substep:1/240,positionTolerance:.05,velocityTolerance:.01},handoff:{watchdogTimeout:3000,occludedFinalizeTimeout:100,finalPaintFrames:2},budgets:{expand:.06,collapse:.02,peek:.01}},
 behavior:{maxStoredActivities:20,notificationPreviewTimeout:5000,sourceThrottle:10000,mergeWindow:3000,resumeDelay:1500,hoverExpands:false,pointerLeaveCollapsesExplicitOpen:false,autoAcquireFocus:false,maxQueuedPreviewCount:3,completedCompactTimeout:6000},
 validation:{nativeGeometryMutationsPerNormalTransitionMax:0,steadyIdlePollingHz:0,dpiPercentages:[100,125,150,200],motionFrameBudget60Hz:16.67,motionFrameBudget120Hz:8,inputFeedbackP95:80,performanceStatus:'requires-current-evidence'},
 accessibility:{testTextScaleFactors:[1,2,2.25],normalTextMinContrast:4.5,coreTextMinContrast:7,respectReducedMotion:true,respectForcedColors:true}};
async function update(path,text){let old;try{old=await readFile(path,'utf8');}catch{}if(old!==text)await writeFile(path,text);}
await mkdir('src/clinical',{recursive:true});await update('src/clinical/tokens.json',JSON.stringify(tokens,null,2)+'\n');
const css=Object.entries(variables).map(([k,v])=>`--${k}:${v};`);
for(const [k,v] of Object.entries(tokens.color))css.push(`--ci-${k}:${v};`);
for(const [k,v] of Object.entries(tokens.space))css.push(`--ci-${k}:${v}px;`);
for(const [k,v] of Object.entries(tokens.type))if(v&&typeof v==='object'){
 css.push(`--ci-${k}-size:calc(${v.size}px * var(--ci-text-scale,1));`,`--ci-${k}-line:calc(${v.lineHeight}px * var(--ci-text-scale,1));`,`--ci-${k}-weight:${v.weight};`,`--ci-${k}-spacing:${v.letterSpacing}px;`);
}
css.push(`--ci-font:${tokens.type.fontFamily};`,`--ci-target:32px;`,`--ci-button-padding:14px;`,`--ci-body-padding-x:20px;`,`--ci-body-padding-y:18px;`,`--ci-section-gap:12px;`,`--ci-art:52px;`,`--ci-art-radius:11.6324px;`);
await update('src/clinical/tokens.css',`/* Generated from ${sourcePath}; do not edit. */\n:root,.ci-anchor{\n${css.join('\n')}\n}\n`);
console.log('UI/UX v1.0 CSS tokens extracted; compatibility adapter generated');
