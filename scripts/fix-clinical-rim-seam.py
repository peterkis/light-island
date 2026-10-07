from pathlib import Path
p=Path(__file__).resolve().parent.parent/'src-tauri/src/clinical_window.rs'
s=p.read_text(encoding='utf8')
old='  let old=ffi::CreateRectRgn(0,0,0,0);let equal='
new='''  // SVG draws a horizontal top rim across the inverse ears. Polygon scan conversion
  // alone drops the end pixels of that seam. Include only its visible half-stroke.
  let seam=ffi::CreateRectRgn((offset-ear*p.scale).floor() as i32,0,
   (offset+(body_width+ear)*p.scale).ceil() as i32,
   (number("/material/rimWidth")*p.scale/2.0).ceil() as i32);
  if seam.is_null(){ffi::DeleteObject(region);return Err("Cannot allocate top rim".into());}
  let seam_ok=ffi::CombineRgn(region,region,seam,2);ffi::DeleteObject(seam);
  if seam_ok==0{ffi::DeleteObject(region);return Err("Cannot combine top rim".into());}
  let old=ffi::CreateRectRgn(0,0,0,0);let equal='''
assert s.count(old)==1
p.write_text(s.replace(old,new),encoding='utf8')
print('Preserve the actual top-rim pixels without enlarging the one-pixel boundary tolerance.')
