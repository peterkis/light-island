//! Pure pixel planning and request guards used by the synchronous geometry commands.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PixelRect { pub x: i32, pub y: i32, pub width: u32, pub height: u32 }
pub fn plan(width: f64, height: f64, scale: f64, screen_x: i32, screen_y: i32, screen_width: u32) -> PixelRect {
    let w = ((width * scale - 1e-7).ceil() as u32).min(screen_width).max(1);
    let h = ((height * scale - 1e-7).ceil() as u32).max(1);
    PixelRect { x: screen_x + ((screen_width - w) / 2) as i32, y: screen_y, width: w, height: h }
}
pub fn local_x(canvas_width: u32, surface_width: f64, scale: f64) -> f64 {
    (canvas_width as f64 - surface_width * scale) / 2.0
}
#[derive(Default)]
pub struct EpochGuard { pub epoch: u64, pub sequence: u64, pub closed: bool }
impl EpochGuard {
    pub fn begin(&mut self, epoch: u64) -> bool {
        if epoch <= self.epoch { return false; }
        self.epoch = epoch; self.sequence = 0; self.closed = false; true
    }
    pub fn frame(&mut self, epoch: u64, sequence: u64) -> bool {
        if epoch != self.epoch || self.closed || sequence <= self.sequence { return false; }
        self.sequence = sequence; true
    }
    pub fn commit(&mut self, epoch: u64) -> bool {
        if epoch != self.epoch || self.closed { return false; }
        self.closed = true; true
    }
    pub fn cancel(&mut self, epoch: u64) {
        if epoch >= self.epoch { self.epoch = epoch; self.closed = true; }
    }
}
#[cfg(test)]
mod tests {
 use super::*;
 #[test] fn latest_epoch_and_frame_win() {
  let mut g=EpochGuard::default(); assert!(g.begin(10)); assert!(g.frame(10,2)); assert!(!g.frame(10,1));
  assert!(g.begin(11)); assert!(!g.commit(10)); assert!(!g.begin(10)); assert!(g.commit(11));
  assert!(!g.frame(11,99)); assert!(!g.commit(11)); assert!(!g.begin(11));
 }
 #[test] fn cancel_fences_a_begin_that_has_not_arrived() {
  let mut g=EpochGuard::default(); g.cancel(20); assert!(!g.begin(20)); assert!(!g.commit(20));
  assert!(g.begin(21));g.cancel(20);assert!(g.frame(21,1));
 }
 #[test] fn physical_rounding_and_origin_at_all_requested_scales() {
  for scale in [1.0,1.25,1.5,2.0] { for screen_width in [160,1365,1920,3840] {
   for width in [178.0,179.0,210.0,79.0,178.4] {
    let a=plan(width,41.0,scale,-1920,-400,screen_width);
    assert_eq!(a,plan(width,41.0,scale,-1920,-400,screen_width));
    assert_eq!(a.y,-400);assert!(a.width<=screen_width);
    assert!((a.x as f64+a.width as f64/2.0-(-1920.0+screen_width as f64/2.0)).abs()<=0.5);
    let shell=160.0_f64.min(a.width as f64/scale-6.0).max(1.0);
    let x=local_x(a.width,shell,scale); assert!(x>=0.0);
    assert!((x+shell*scale/2.0-a.width as f64/2.0).abs()<1e-7);
   }
  }}
 }
 #[test] fn equal_pixel_rect_skips_a_layout_change() {
  assert_eq!(plan(178.00000000001,41.0,1.0,0,0,1920),plan(178.0,41.0,1.0,0,0,1920));
 }
}
