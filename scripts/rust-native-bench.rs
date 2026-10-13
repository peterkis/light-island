//! Standalone finite harness; compile with the application's Release optimization flags.
#[path = "../src-tauri/src/clinical_region.rs"]
mod clinical_region;
#[path = "rust-performance-reference.rs"]
mod performance_reference;
#[path = "../src-tauri/src/shadow_raster.rs"]
mod shadow_raster;

#[cfg(not(test))]
mod benchmark {
    use super::{
        clinical_region, performance_reference,
        shadow_raster::{self, ShadowSpec},
    };
    use std::{
        alloc::{GlobalAlloc, Layout, System},
        ffi::c_void,
        hint::black_box,
        sync::atomic::{AtomicBool, AtomicUsize, Ordering},
        time::Instant,
    };

    struct CountedAllocator;
    static COUNTING: AtomicBool = AtomicBool::new(false);
    static ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static BYTES: AtomicUsize = AtomicUsize::new(0);
    unsafe impl GlobalAlloc for CountedAllocator {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            if COUNTING.load(Ordering::Relaxed) {
                ALLOCATIONS.fetch_add(1, Ordering::Relaxed);
                BYTES.fetch_add(layout.size(), Ordering::Relaxed);
            }
            System.alloc(layout)
        }
        unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
            System.dealloc(ptr, layout);
        }
    }
    #[global_allocator]
    static ALLOCATOR: CountedAllocator = CountedAllocator;

    #[link(name = "gdi32")]
    extern "system" {
        fn CreateRectRgn(x: i32, y: i32, right: i32, bottom: i32) -> *mut c_void;
        fn SetRectRgn(region: *mut c_void, x: i32, y: i32, right: i32, bottom: i32) -> i32;
        fn DeleteObject(object: *mut c_void) -> i32;
    }
    fn sample(iterations: usize, work: &mut impl FnMut()) -> f64 {
        let started = Instant::now();
        for _ in 0..iterations {
            work();
        }
        started.elapsed().as_nanos() as f64 / iterations as f64
    }
    fn count(work: &mut impl FnMut()) -> (usize, usize) {
        ALLOCATIONS.store(0, Ordering::Relaxed);
        BYTES.store(0, Ordering::Relaxed);
        COUNTING.store(true, Ordering::Relaxed);
        work();
        COUNTING.store(false, Ordering::Relaxed);
        (
            ALLOCATIONS.load(Ordering::Relaxed),
            BYTES.load(Ordering::Relaxed),
        )
    }
    fn compare(
        name: &str,
        iterations: usize,
        mut original: impl FnMut(),
        mut optimized: impl FnMut(),
    ) {
        for _ in 0..3 {
            original();
            optimized();
        }
        let mut baseline = Vec::new();
        let mut after = Vec::new();
        for round in 0..9 {
            if round % 2 == 0 {
                baseline.push(sample(iterations, &mut original));
                after.push(sample(iterations, &mut optimized));
            } else {
                after.push(sample(iterations, &mut optimized));
                baseline.push(sample(iterations, &mut original));
            }
        }
        let (baseline_allocations, baseline_bytes) = count(&mut original);
        let (optimized_allocations, optimized_bytes) = count(&mut optimized);
        println!("{{\"case\":\"{name}\",\"iterationsPerRound\":{iterations},\"baselineNs\":{baseline:?},\"optimizedNs\":{after:?},\"baselineAllocations\":{baseline_allocations},\"optimizedAllocations\":{optimized_allocations},\"baselineAllocatedBytes\":{baseline_bytes},\"optimizedAllocatedBytes\":{optimized_bytes}}}");
    }
    pub fn run() {
        for scale in [1.0, 1.5, 2.0] {
            let spec = ShadowSpec {
                canvas_width: (800.0_f64 * scale).ceil() as usize + 1,
                canvas_height: (670.0_f64 * scale).ceil() as usize,
                scale,
                width: 372.3,
                height: 168.2,
                radius: 40.0,
                top: 8.0,
                alpha: 0.83,
            };
            let mut baseline = vec![0; spec.canvas_width * spec.canvas_height];
            let mut after = baseline.clone();
            compare(
                &format!("shadow-scale-{scale}"),
                24,
                || {
                    performance_reference::render_shadow(
                        black_box(&mut baseline),
                        black_box(&spec),
                    );
                    black_box(&baseline);
                },
                || {
                    shadow_raster::render(black_box(&mut after), black_box(&spec)).unwrap();
                    black_box(&after);
                },
            );
        }
        let points: Vec<[f64; 2]> = (0..128)
            .map(|i| {
                let t = i as f64 * std::f64::consts::TAU / 128.0;
                [186.0 + 186.0 * t.cos(), 84.0 + 84.0 * t.sin()]
            })
            .collect();
        for scale in [1.0, 1.5, 2.0] {
            unsafe {
                let region = CreateRectRgn(0, 0, 0, 0);
                assert!(!region.is_null());
                compare(
                    &format!("region-handoff-scale-{scale}"),
                    128,
                    || {
                        assert_ne!(SetRectRgn(region, 0, 0, 0, 0), 0);
                        performance_reference::add_dilated(
                            region,
                            black_box(&points),
                            155.3,
                            scale,
                            2,
                        )
                        .unwrap();
                        performance_reference::add_dilated(
                            region,
                            black_box(&points),
                            156.7,
                            scale,
                            2,
                        )
                        .unwrap();
                    },
                    || {
                        assert_ne!(SetRectRgn(region, 0, 0, 0, 0), 0);
                        clinical_region::add_dilated(region, black_box(&points), 155.3, scale, 2)
                            .unwrap();
                        clinical_region::add_dilated(region, black_box(&points), 156.7, scale, 2)
                            .unwrap();
                    },
                );
                DeleteObject(region);
            }
        }
    }
}

#[cfg(not(test))]
fn main() {
    benchmark::run();
}
