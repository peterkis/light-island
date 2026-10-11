import T from './tokens.json';
export type Surface='idle'|'compact'|'alert'|'rich'|'stack'|'lab-sum'|'lab-read'|'lab-done';
export type Dock='notch'|'floating';
export type Point=[number,number];
/** Width is the BODY width from UI/UX §2.2; notch ears extend 10 DIP per side. */
export interface Shape {width:number;height:number;radius:number;ear:number;top?:number;satellite?:number;neck?:boolean;shift?:number}
export const roundGrid=(x:number)=>Math.ceil(x/4)*4;
export function layoutWidth(view:'idle'|'compact'|'expanded'|Surface,available:number,scale=1):number {
 const g=T.geometry,kind=view==='expanded'?'rich':view;
 const base=kind==='idle'?g.idle.width:kind==='compact'?g.compact.width:kind==='alert'?g.alert.width:kind==='stack'?g.stack.width:g.expanded.baseWidth;
 const preferred=kind==='idle'||kind==='compact'?base:Math.min(g.expanded.preferredMaxWidth,base+g.expanded.widthGrowthPerTextScale*(scale-1));
 return Math.max(96,Math.floor(Math.min(preferred,available-2*g.viewportMargin-2*g.earRadius)/4)*4);
}
export function layoutHeight(view:'idle'|'compact'|'expanded'|Surface,natural:number,availableHeight:number,scale=1):number {
 const g=T.geometry,kind=view==='expanded'?'rich':view;
 if(kind==='idle')return g.idle.height;
 if(kind==='compact')return roundGrid(Math.max(g.compact.minHeight,16*scale+12));
 const base=kind==='alert'?g.alert.height:kind==='stack'?g.stack.height:g.expanded.richMinHeight;
 // The 30% cap is relaxed only for enlarged text's fixed accessible controls (§11.1).
 const accessible=kind==='alert'?32+56*scale:kind==='stack'?72+88*scale:36+132*scale;
 const cap=scale>1?Math.min(480,availableHeight*.6):Math.min(g.stack.height,availableHeight*.3);
 return Math.max(32,Math.floor(Math.min(Math.max(base,accessible,natural),cap)/4)*4);
}
/** §2.2 named radii take precedence over the conflicting generic r=h/2 formula. */
export function radiusAt(height:number):number {
 const anchors=[[32,16],[36,18],[88,36],[168,40],[280,44]];
 if(height<=32)return Math.max(0,height/2);
 for(let i=1;i<anchors.length;i++)if(height<=anchors[i][0]){const [h0,r0]=anchors[i-1],[h1,r1]=anchors[i];return r0+(r1-r0)*(height-h0)/(h1-h0);}
 return 44;
}
/** Shared continuous-cubic squircle approximation (C2 at straight joins), not the
 * circular §2.4 demonstration path. Native rasterization consumes these very points. */
export function contour(g:Shape):{path:string;points:Point[]} {
 const w=g.width,h=g.height,e=Math.max(0,g.ear),r=Math.min(g.radius,w/2,h-(e?e:0));
 const points:Point[]=[],commands:string[]=[];let current:Point=[0,0];
 const f=(x:number)=>Number(x.toFixed(4));
 const move=(x:number,y:number)=>{current=[x,y];points.push(current);commands.push(`M${f(x)},${f(y)}`);};
 const line=(x:number,y:number)=>{current=[x,y];points.push(current);commands.push(`L${f(x)},${f(y)}`);};
 function curve(a:Point,b:Point,end:Point){const p=current;commands.push(`C${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(end[0])},${f(end[1])}`);
  for(let i=1;i<=16;i++){const t=i/16,s=1-t;points.push([s*s*s*p[0]+3*s*s*t*a[0]+3*s*t*t*b[0]+t*t*t*end[0],s*s*s*p[1]+3*s*s*t*a[1]+3*s*t*t*b[1]+t*t*t*end[1]]);}current=end;}
 const a=Math.pow(.5,.25),b=.4435901110408307;
 // Quarter curve starts at (0,0), ends at (r,r), with vertical then horizontal tangent.
 function corner(map:(x:number,y:number)=>Point){
  curve(map(0,b*r),map(0,(2*a-1)*r),map((1-a)*r,a*r));
  curve(map((2-2*a)*r,r),map((1-b)*r,r),map(r,r));
 }
 if(e){move(-e,0);line(w+e,0);curve([w+.44771525*e,0],[w,e*.44771525],[w,e]);}
 else{move(r,0);line(w-r,0);corner((x,y)=>[w-r+y,x]);}
 line(w,h-r);corner((x,y)=>[w-x,h-r+y]);line(r,h);corner((x,y)=>[r-y,h-x]);
 if(e){line(0,e);curve([0,e*.44771525],[-e*.44771525,0],[-e,0]);}
 else{line(0,r);corner((x,y)=>[x,r-y]);}
 commands.push('Z');return {path:commands.join(' '),points};
}
export function satelliteGeometry(g:Shape){const p=Math.max(0,Math.min(1,g.satellite??0)),size=T.geometry.minimal*p;return {size,x:g.width+(g.ear?g.ear:0)+8*p-size*(1-p),y:0};}
/** Analytic viscous bridge: the same finite vector boundary goes to SVG and HRGN.
 * No full-surface blur/filter, and no bridge at either resting endpoint. */
export function satelliteNeck(g:Shape):{path:string;points:Point[]} {
 const p=Math.max(0,Math.min(1,g.satellite??0)),s=satelliteGeometry(g);
 if(!g.neck||p<=.02||p>=.98)return {path:'',points:[]};
 const left=g.width-14,right=s.x+s.size*.5,center=s.size*.5;
 const half=Math.min(s.size*.4,8*Math.sin(Math.PI*p)),waist=half*.22,middle=(left+right)/2;
 const points:Point[]=[],commands:string[]=[];
 const start:Point=[left,Math.max(0,center-half)];points.push(start);commands.push(`M${start}`);
 const curve=(a:Point,b:Point,end:Point)=>{const old=points[points.length-1];commands.push(`C${a} ${b} ${end}`);for(let i=1;i<=12;i++){const t=i/12,u=1-t;points.push([u*u*u*old[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*end[0],u*u*u*old[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*end[1]]);}};
 curve([middle,center-waist],[middle,center-waist],[right,center-half]);
 points.push([right,center+half]);commands.push(`L${right},${center+half}`);
 curve([middle,center+waist],[middle,center+waist],[left,center+half]);commands.push('Z');
 return {path:commands.join(' '),points};
}
export function shapePolygons(g:Shape):Point[][] {
 const polys=[contour(g).points.map(([x,y])=>[x,y+(g.top??0)] as Point)];
 const s=satelliteGeometry(g);if(s.size>.1){const r=s.size/2;polys.push(Array.from({length:64},(_,i)=>{const a=2*Math.PI*i/64;return [s.x+r+r*Math.cos(a),(g.top??0)+s.y+r+r*Math.sin(a)] as Point;}));}
 const bridge=satelliteNeck(g);if(bridge.points.length)polys.push(bridge.points.map(([x,y])=>[x,y+(g.top??0)] as Point));
 return polys;
}
export function motionShape(g:Shape):Shape{return {width:g.width,height:g.height,radius:g.radius,ear:g.ear,top:g.top??0,satellite:g.satellite??0,neck:g.neck??false,shift:g.shift??0};}
