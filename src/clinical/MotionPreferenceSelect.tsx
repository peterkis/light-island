import {useMotionPreference,parseMotionPreference,resolveMotion} from './motionPreference';
export function MotionPreferenceSelect({applicationReduced,onEnable,windowsAnimationsEnabled=true,label='工作台动效模式'}:{applicationReduced:boolean;onEnable:()=>void;windowsAnimationsEnabled?:boolean;label?:string}){
 const motion=useMotionPreference();
 const effective=resolveMotion(motion.preference,applicationReduced,motion.mediaReduced,windowsAnimationsEnabled);
 return <div className="ux-motion-preference"><label>{label}<select aria-label={label} value={motion.preference} onChange={e=>{
  const next=parseMotionPreference(e.target.value);if(next){if(next!=='reduced')onEnable();motion.choose(next);}
 }}><option value="system">跟随系统</option><option value="full">完整动效（仅此应用）</option><option value="reduced">减弱动效</option></select></label>
 <p role="status">{motion.saveError||effective.reason}</p><small>默认尊重系统偏好；选择完整动效不修改 Windows 设置，随时可切回</small></div>;
}
