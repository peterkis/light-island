import type {LabState} from './model';
import tokens from './tokens.json';
export function labGeometry(state:LabState,available:number,height:number,textScale=1){
 const g=tokens.geometry[state==='burn'?'read':state];
 const width=state==='idle'||state==='done'?g.width:Math.min(g.width,available-(state==='read'||state==='burn'?16:24));
 const expandedWidth=textScale>1&&state!=='idle'?Math.min(state==='done'?400:560,width+140*(textScale-1),available-24):width;
 const readerHeight=Math.min(Math.max(tokens.geometry.read.minHeight,Math.min(tokens.geometry.read.maxHeight,height-100)),Math.max(120,height-16));
 const h=state==='idle'?32:state==='done'?36:state==='alert'?88:state==='sum'?200:readerHeight;
 const accessible=state==='alert'?32+56*textScale:state==='sum'?64+136*textScale:h;
 const finalHeight=state==='done'&&textScale>1?Math.ceil(13*textScale*1.4+12):textScale>1&&state!=='idle'?Math.min(Math.max(h,accessible),Math.max(120,height-16)):h;
 return {width:Math.max(96,expandedWidth),height:finalHeight,radius:state==='done'?finalHeight/2:g.radius};
}
