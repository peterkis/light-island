//! Independent non-activating, click-through shadow. No WebView or idle render loop.
use std::{ffi::c_void,sync::Mutex};
use tauri::WebviewWindow;
#[repr(C)]#[derive(Default,Clone,Copy)]struct Point{x:i32,y:i32}
#[repr(C)]struct Size{x:i32,y:i32}
#[repr(C)]#[derive(Default)]struct Rect{left:i32,top:i32,right:i32,bottom:i32}
#[repr(C)]struct Blend{op:u8,flags:u8,alpha:u8,format:u8}
#[repr(C)]struct Header{size:u32,w:i32,h:i32,planes:u16,bits:u16,compression:u32,image:u32,xppm:i32,yppm:i32,colors:u32,important:u32}
#[link(name="user32")]extern "system"{
 fn CreateWindowExW(ex:u32,class:*const u16,name:*const u16,style:u32,x:i32,y:i32,w:i32,h:i32,parent:*mut c_void,menu:*mut c_void,instance:*mut c_void,param:*mut c_void)->*mut c_void;
 fn GetWindowRect(h:*mut c_void,r:*mut Rect)->i32;fn GetDpiForWindow(h:*mut c_void)->u32;
 fn UpdateLayeredWindow(h:*mut c_void,dst:*mut c_void,point:*const Point,size:*const Size,source:*mut c_void,origin:*const Point,key:u32,blend:*const Blend,flags:u32)->i32;
 fn SetWindowPos(h:*mut c_void,after:*mut c_void,x:i32,y:i32,w:i32,height:i32,flags:u32)->i32;
 fn ShowWindow(h:*mut c_void,cmd:i32)->i32;fn DestroyWindow(h:*mut c_void)->i32;
 fn GetDC(h:*mut c_void)->*mut c_void;fn ReleaseDC(h:*mut c_void,dc:*mut c_void)->i32;
}
#[link(name="gdi32")]extern "system"{
 fn CreateCompatibleDC(h:*mut c_void)->*mut c_void;fn DeleteDC(h:*mut c_void)->i32;
 fn CreateDIBSection(dc:*mut c_void,info:*const Header,usage:u32,bits:*mut *mut c_void,section:*mut c_void,offset:u32)->*mut c_void;
 fn SelectObject(dc:*mut c_void,obj:*mut c_void)->*mut c_void;fn DeleteObject(obj:*mut c_void)->i32;
 fn BitBlt(dst:*mut c_void,x:i32,y:i32,w:i32,h:i32,src:*mut c_void,sx:i32,sy:i32,op:u32)->i32;
 fn GdiFlush()->i32;
}
struct Layer{hwnd:usize,dc:usize,bitmap:usize,old:usize,bits:usize,width:i32,height:i32,signature:[i32;5]}
static LAYER:Mutex<Option<Layer>>=Mutex::new(None);
fn wide(s:&str)->Vec<u16>{s.encode_utf16().chain(Some(0)).collect()}
unsafe fn release(l:Layer){
 ShowWindow(l.hwnd as _,0);
 SelectObject(l.dc as _,l.old as _);
 DeleteObject(l.bitmap as _);DeleteDC(l.dc as _);DestroyWindow(l.hwnd as _);
}
unsafe fn allocate(width:i32,height:i32)->Result<Layer,String>{
 let hwnd=CreateWindowExW(0x00080000|0x20|0x08000000|0x80,wide("STATIC").as_ptr(),wide("Samewave Island Shadow").as_ptr(),0x80000000,0,0,width,height,std::ptr::null_mut(),std::ptr::null_mut(),std::ptr::null_mut(),std::ptr::null_mut());
 if hwnd.is_null(){return Err("Cannot create noninteractive shadow layer".into());}
 let dc=CreateCompatibleDC(std::ptr::null_mut());let mut bits=std::ptr::null_mut();
 let header=Header{size:40,w:width,h:-height,planes:1,bits:32,compression:0,image:0,xppm:0,yppm:0,colors:0,important:0};
 let bitmap=CreateDIBSection(dc,&header,0,&mut bits,std::ptr::null_mut(),0);
 if dc.is_null()||bitmap.is_null()||bits.is_null(){if !dc.is_null(){DeleteDC(dc);}DestroyWindow(hwnd);return Err("Cannot allocate shadow bitmap".into());}
 let old=SelectObject(dc,bitmap);
 Ok(Layer{hwnd:hwnd as _,dc:dc as _,bitmap:bitmap as _,old:old as _,bits:bits as _,width,height,signature:[-1;5]})
}
fn distance(x:f64,y:f64,half_w:f64,half_h:f64,r:f64)->f64{
 let qx=x.abs()-(half_w-r);let qy=y.abs()-(half_h-r);
 let a=qx.max(0.0);let b=qy.max(0.0);
 let outside=if a==0.0{b}else if b==0.0{a}else{(a*a+b*b).sqrt()};
 outside+qx.max(qy).min(0.0)-r
}
fn gaussian(d:f64,sigma:f64)->f64{
 let x=(d/sigma).abs();let t=1.0/(1.0+0.2316419*x);
 let v=0.39894228*(-x*x/2.0).exp()*t*(0.31938153+t*(-0.35656378+t*(1.78147794+t*(-1.82125598+t*1.33027443))));
 if d>=0.0{v}else{1.0-v}
}
pub fn hide(){if let Ok(guard)=LAYER.lock(){if let Some(l)=guard.as_ref(){unsafe{ShowWindow(l.hwnd as _,0);}}}}
pub fn close(){if let Ok(mut guard)=LAYER.lock(){if let Some(l)=guard.take(){unsafe{release(l);}}}}
pub fn draw(window:&WebviewWindow,width:f64,height:f64,radius:f64,top:f64,alpha:f64)->Result<(),String>{
 if alpha<=0.001{hide();return Ok(());}
 unsafe{
  let hwnd=window.hwnd().map_err(|e|e.to_string())?;let scale=GetDpiForWindow(hwnd.0 as _) as f64/96.0;
  let mut rect=Rect::default();if GetWindowRect(hwnd.0 as _,&mut rect)==0{return Err("Shadow anchor unavailable".into());}
  let margin=(48.0*scale).ceil() as i32;let bw=rect.right-rect.left+2*margin;let bh=rect.bottom-rect.top+margin;
  let mut guard=LAYER.lock().map_err(|_|"Shadow unavailable")?;
  if guard.as_ref().is_some_and(|l|l.width!=bw||l.height!=bh){release(guard.take().unwrap());}
  if guard.is_none(){*guard=Some(allocate(bw,bh)?);}
  let l=guard.as_mut().unwrap();let signature=[(width*scale).round() as i32,(height*scale).round() as i32,(radius*scale).round() as i32,(top*scale).round() as i32,(alpha*255.0).round() as i32];
  if l.signature!=signature{
   let pixels=std::slice::from_raw_parts_mut(l.bits as *mut u32,(bw*bh) as usize);pixels.fill(0);
   let cx=bw as f64/2.0;let hw=width*scale/2.0;let hh=height*scale/2.0;let r=radius*scale;
   let table1:Vec<f64>=(-256..=256).map(|i|gaussian(i as f64/4.0,16.0*scale)).collect();
   let table2:Vec<f64>=(-256..=256).map(|i|gaussian(i as f64/4.0,3.0*scale)).collect();
   let lookup=|table:&Vec<f64>,d:f64|table[((d*4.0).round() as i32+256).clamp(0,512) as usize];
   for y in 0..bh.min(((top+height+48.0)*scale).ceil() as i32){
    for x in (cx-hw-margin as f64).floor().max(0.0) as i32..((cx+hw+margin as f64).ceil() as i32).min(bw){
     let d1=distance(x as f64+0.5-cx,y as f64+0.5-(top+12.0)*scale-hh,hw-4.0*scale,hh-4.0*scale,(r-4.0*scale).max(0.0));
     let d2=distance(x as f64+0.5-cx,y as f64+0.5-(top+2.0)*scale-hh,hw,hh,r);
     let a1=0.45*lookup(&table1,d1);let a2=0.30*lookup(&table2,d2);
     let value=((1.0-(1.0-a1)*(1.0-a2))*alpha*255.0).round().clamp(0.0,255.0) as u32;
     pixels[(y*bw+x) as usize]=value<<24;
    }
   }
   l.signature=signature;
   let position=Point{x:rect.left-margin,y:rect.top};let size=Size{x:bw,y:bh};let origin=Point::default();let blend=Blend{op:0,flags:0,alpha:255,format:1};
   if UpdateLayeredWindow(l.hwnd as _,std::ptr::null_mut(),&position,&size,l.dc as _,&origin,0,&blend,2)==0{return Err("Shadow composition failed".into());}
  }
  SetWindowPos(l.hwnd as _,hwnd.0 as _,0,0,0,0,0x0010|0x0001|0x0002|0x0040);
 }
 Ok(())
}
/// Only an averaged luminance number is returned, never captured desktop pixels.
#[tauri::command]
pub fn clinical_background_luminance(window:WebviewWindow,body_height:f64)->Result<f64,String>{
 if window.label()!="island"||!body_height.is_finite()||!(24.0..=510.0).contains(&body_height){return Err("Invalid background sample".into());}
 unsafe{
  let hwnd=window.hwnd().map_err(|e|e.to_string())?;let mut r=Rect::default();GetWindowRect(hwnd.0 as _,&mut r);
  let scale=GetDpiForWindow(hwnd.0 as _) as f64/96.0;
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
