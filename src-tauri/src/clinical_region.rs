//! Reuse a polygon region for finite physical-pixel dilation. Never owns an HWND.
use std::ffi::c_void;

#[repr(C)]
struct Point {
    x: i32,
    y: i32,
}

#[link(name = "gdi32")]
extern "system" {
    fn CreatePolygonRgn(points: *const Point, count: i32, mode: i32) -> *mut c_void;
    fn OffsetRgn(region: *mut c_void, x: i32, y: i32) -> i32;
    fn CombineRgn(dest: *mut c_void, a: *mut c_void, b: *mut c_void, mode: i32) -> i32;
    fn DeleteObject(object: *mut c_void) -> i32;
}

struct OwnedRegion(*mut c_void);
impl Drop for OwnedRegion {
    fn drop(&mut self) {
        // This temporary polygon is never installed by SetWindowRgn.
        unsafe {
            DeleteObject(self.0);
        }
    }
}

/// Unions the original square fringe into an existing destination HRGN.
///
/// # Safety
/// `region` must be a live, exclusively accessed GDI region. The caller validates
/// the bounded logical outline and actual client dimensions before calling.
pub(crate) unsafe fn add_dilated(
    region: *mut c_void,
    points: &[[f64; 2]],
    offset: f64,
    scale: f64,
    fringe: i32,
) -> Result<(), &'static str> {
    let native: Vec<Point> = points
        .iter()
        .map(|pt| Point {
            x: (offset + pt[0] * scale).round() as i32,
            y: (pt[1] * scale).round() as i32,
        })
        .collect();
    let part = CreatePolygonRgn(native.as_ptr(), native.len() as i32, 2);
    if part.is_null() {
        return Err("Cannot allocate outline");
    }
    let part = OwnedRegion(part);
    let (mut last_x, mut last_y) = (0, 0);
    // Integer translation commutes with the already-rounded physical polygon.
    // Rasterize once instead of allocating and rounding every fringe copy.
    for dy in -fringe..=fringe {
        for dx in -fringe..=fringe {
            if OffsetRgn(part.0, dx - last_x, dy - last_y) == 0 {
                return Err("Cannot offset outline");
            }
            (last_x, last_y) = (dx, dy);
            if CombineRgn(region, region, part.0, 2) == 0 {
                return Err("Cannot combine outline");
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::performance_reference;
    static TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    #[link(name = "gdi32")]
    extern "system" {
        fn CreateRectRgn(x: i32, y: i32, right: i32, bottom: i32) -> *mut c_void;
        fn EqualRgn(a: *mut c_void, b: *mut c_void) -> i32;
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn GetCurrentProcess() -> *mut c_void;
    }
    #[link(name = "user32")]
    extern "system" {
        fn GetGuiResources(process: *mut c_void, flags: u32) -> u32;
    }

    #[test]
    fn reused_polygon_preserves_dilation_and_previous_next_union_at_all_scales() {
        let _lock = TEST_LOCK.lock().unwrap();
        for scale in [1.0, 1.25, 1.5, 1.75, 2.0, 2.25] {
            for fringe in [0, 1, 2, 3] {
                let old = [
                    [-10.0, 0.0],
                    [382.0, 0.0],
                    [372.0, 10.3],
                    [355.2, 150.9],
                    [330.0, 168.0],
                    [40.0, 168.0],
                    [0.0, 120.1],
                    [0.0, 10.0],
                ];
                // A detached S2 lobe exercises disjoint regions as well as the main body.
                let lobe = [[403.2, 0.0], [439.2, 0.0], [439.2, 36.0], [403.2, 36.0]];
                unsafe {
                    let actual = OwnedRegion(CreateRectRgn(0, 0, 0, 0));
                    let expected = OwnedRegion(CreateRectRgn(0, 0, 0, 0));
                    assert!(!actual.0.is_null() && !expected.0.is_null());
                    for (points, offset) in
                        [(&old[..], 155.3), (&old[..], 156.7), (&lobe[..], 155.3)]
                    {
                        add_dilated(actual.0, points, offset, scale, fringe).unwrap();
                        performance_reference::add_dilated(
                            expected.0, points, offset, scale, fringe,
                        )
                        .unwrap();
                    }
                    assert_ne!(
                        EqualRgn(actual.0, expected.0),
                        0,
                        "scale={scale}, fringe={fringe}"
                    );
                }
            }
        }
    }

    #[test]
    fn temporary_polygon_is_released_when_union_fails() {
        let _lock = TEST_LOCK.lock().unwrap();
        let points = [[0.0, 0.0], [124.0, 0.0], [124.0, 32.0], [0.0, 32.0]];
        unsafe {
            let sentinel = OwnedRegion(CreateRectRgn(0, 0, 1, 1));
            assert!(!sentinel.0.is_null());
            let before = GetGuiResources(GetCurrentProcess(), 0);
            assert!(before > 0);
            for _ in 0..128 {
                assert!(add_dilated(std::ptr::null_mut(), &points, 1.0, 1.0, 2).is_err());
            }
            assert_eq!(GetGuiResources(GetCurrentProcess(), 0), before);
        }
    }
}
