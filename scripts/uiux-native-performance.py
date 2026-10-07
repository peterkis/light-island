from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent;out=root/'evidence/uiux-final-20261006';before=out/'before-performance';before.mkdir(exist_ok=True)
for name in ['paint-cadence.json','native-cost.json','luminance-cost.json','native-validation.json','final-commands.json','tested-hashes.json']:
 p=out/name
 if p.exists():shutil.copy2(p,before/name)
p=root/'src-tauri/src/clinical_shadow.rs';s=p.read_text(encoding='utf8')
s=s.replace(' fn GetPixel(dc:*mut c_void,x:i32,y:i32)->u32;', ' fn BitBlt(dst:*mut c_void,x:i32,y:i32,w:i32,h:i32,src:*mut c_void,sx:i32,sy:i32,op:u32)->i32;\n fn GdiFlush()->i32;')
s=s.replace(' qx.max(0.0).hypot(qy.max(0.0))+qx.max(qy).min(0.0)-r', ' let a=qx.max(0.0);let b=qy.max(0.0);\n let outside=if a==0.0{b}else if b==0.0{a}else{(a*a+b*b).sqrt()};\n outside+qx.max(qy).min(0.0)-r')
a=s.index('  let s=GetDpiForWindow(hwnd.0 as _) as f64/96.0;let dc=GetDC',s.index('pub fn clinical_background_luminance'))
s=s[:a]+'''  let scale=GetDpiForWindow(hwnd.0 as _) as f64/96.0;
  let w=(160.0*scale).ceil() as i32;let h=(60.0*scale).ceil() as i32;
  if w<=0||h<=0||w>1280||h>480{return Err("Invalid background sample dimensions".into());}
  let screen=GetDC(std::ptr::null_mut());if screen.is_null(){return Err("Desktop sample unavailable".into());}
  let dc=CreateCompatibleDC(screen);let mut bits=std::ptr::null_mut();
  let header=Header{size:40,w,h:-h,planes:1,bits:32,compression:0,image:0,xppm:0,yppm:0,colors:0,important:0};
  let bitmap=CreateDIBSection(dc,&header,0,&mut bits,std::ptr::null_mut(),0);
  if dc.is_null()||bitmap.is_null()||bits.is_null(){if !bitmap.is_null(){DeleteObject(bitmap);}if !dc.is_null(){DeleteDC(dc);}ReleaseDC(std::ptr::null_mut(),screen);return Err("Background sample allocation failed".into());}
  let old=SelectObject(dc,bitmap);
  // One GPU readback replaces 96 synchronous GetPixel calls. Pixels never leave this command.
  let ok=BitBlt(dc,0,0,w,h,screen,(r.left+r.right)/2-w/2,r.top+((body_height+48.0)*scale).round() as i32,0x00CC0020);
  GdiFlush();
  let mut sum=0.0;
  if ok!=0{
   let linear:[f64;256]=std::array::from_fn(|i|{let x=i as f64/255.0;if x<=0.04045{x/12.92}else{((x+0.055)/1.055).powf(2.4)}});
   let pixels=std::slice::from_raw_parts(bits as *const u32,(w*h) as usize);
   for color in pixels{sum+=0.2126*linear[((color>>16)&255) as usize]+0.7152*linear[((color>>8)&255) as usize]+0.0722*linear[(color&255) as usize];}
  }
  SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(std::ptr::null_mut(),screen);
  if ok==0{return Err("Background sample readback failed".into());}
  Ok(sum/(w*h) as f64)
 }
}
'''
p.write_text(s,encoding='utf8')
p=root/'src/clinical/usePlatform.ts';s=p.read_text(encoding='utf8').replace("if(dead||busy||live.current||[1,2,3,4,6].includes(status.notificationState))return;", "if(dead||busy||live.current||host.current?.dataset.motionPhase!=='settled'||[1,2,3,4,6].includes(status.notificationState))return;")
p.write_text(s,encoding='utf8')
print('Replaced synchronous per-pixel desktop reads with one bounded in-memory capture; optimized shadow distance math')
