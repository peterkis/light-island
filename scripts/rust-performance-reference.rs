//! Frozen algorithms from the pre-optimization Rust baseline, for differential QA only.
use crate::shadow_raster::ShadowSpec;
use std::ffi::c_void;

fn distance(x: f64, y: f64, half_w: f64, half_h: f64, r: f64) -> f64 {
    let qx = x.abs() - (half_w - r);
    let qy = y.abs() - (half_h - r);
    let a = qx.max(0.0);
    let b = qy.max(0.0);
    let outside = if a == 0.0 {
        b
    } else if b == 0.0 {
        a
    } else {
        (a * a + b * b).sqrt()
    };
    outside + qx.max(qy).min(0.0) - r
}
fn gaussian(d: f64, sigma: f64) -> f64 {
    let x = (d / sigma).abs();
    let t = 1.0 / (1.0 + 0.2316419 * x);
    let v = 0.39894228
        * (-x * x / 2.0).exp()
        * t
        * (0.31938153 + t * (-0.35656378 + t * (1.78147794 + t * (-1.82125598 + t * 1.33027443))));
    if d >= 0.0 {
        v
    } else {
        1.0 - v
    }
}
pub(crate) fn render_shadow(pixels: &mut [u32], spec: &ShadowSpec) {
    let bw = spec.canvas_width as i32;
    let bh = spec.canvas_height as i32;
    let scale = spec.scale;
    let margin = (48.0 * scale).ceil() as i32;
    pixels.fill(0);
    let cx = bw as f64 / 2.0;
    let hw = spec.width * scale / 2.0;
    let hh = spec.height * scale / 2.0;
    let r = spec.radius * scale;
    let table1: Vec<f64> = (-256..=256)
        .map(|i| gaussian(i as f64 / 4.0, 16.0 * scale))
        .collect();
    let table2: Vec<f64> = (-256..=256)
        .map(|i| gaussian(i as f64 / 4.0, 3.0 * scale))
        .collect();
    let lookup =
        |table: &[f64], d: f64| table[((d * 4.0).round() as i32 + 256).clamp(0, 512) as usize];
    for y in 0..bh.min(((spec.top + spec.height + 48.0) * scale).ceil() as i32) {
        for x in (cx - hw - margin as f64).floor().max(0.0) as i32
            ..((cx + hw + margin as f64).ceil() as i32).min(bw)
        {
            let d1 = distance(
                x as f64 + 0.5 - cx,
                y as f64 + 0.5 - (spec.top + 12.0) * scale - hh,
                hw - 4.0 * scale,
                hh - 4.0 * scale,
                (r - 4.0 * scale).max(0.0),
            );
            let d2 = distance(
                x as f64 + 0.5 - cx,
                y as f64 + 0.5 - (spec.top + 2.0) * scale - hh,
                hw,
                hh,
                r,
            );
            let a1 = 0.45 * lookup(&table1, d1);
            let a2 = 0.30 * lookup(&table2, d2);
            let value = ((1.0 - (1.0 - a1) * (1.0 - a2)) * spec.alpha * 255.0)
                .round()
                .clamp(0.0, 255.0) as u32;
            pixels[(y * bw + x) as usize] = value << 24;
        }
    }
}

#[repr(C)]
struct Point {
    x: i32,
    y: i32,
}
#[link(name = "gdi32")]
extern "system" {
    fn CreatePolygonRgn(points: *const Point, count: i32, mode: i32) -> *mut c_void;
    fn CombineRgn(dest: *mut c_void, a: *mut c_void, b: *mut c_void, mode: i32) -> i32;
    fn DeleteObject(object: *mut c_void) -> i32;
}
pub(crate) unsafe fn add_dilated(
    region: *mut c_void,
    points: &[[f64; 2]],
    offset: f64,
    scale: f64,
    fringe: i32,
) -> Result<(), &'static str> {
    for dy in -fringe..=fringe {
        for dx in -fringe..=fringe {
            let native: Vec<Point> = points
                .iter()
                .map(|pt| Point {
                    x: (offset + pt[0] * scale).round() as i32 + dx,
                    y: (pt[1] * scale).round() as i32 + dy,
                })
                .collect();
            let part = CreatePolygonRgn(native.as_ptr(), native.len() as i32, 2);
            if part.is_null() {
                return Err("Cannot allocate outline");
            }
            let ok = CombineRgn(region, region, part, 2);
            DeleteObject(part);
            if ok == 0 {
                return Err("Cannot combine outline");
            }
        }
    }
    Ok(())
}
