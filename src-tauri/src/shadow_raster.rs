//! CPU shadow rasterization. No desktop pixels, HWND changes, or retained frame loop.

/// Physical bitmap allocation and logical shadow geometry for one finite draw.
pub(crate) struct ShadowSpec {
    pub canvas_width: usize,
    pub canvas_height: usize,
    pub scale: f64,
    pub width: f64,
    pub height: f64,
    pub radius: f64,
    pub top: f64,
    pub alpha: f64,
}

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

/// Writes the same premultiplied black pixels as the original full-width raster.
pub(crate) fn render(pixels: &mut [u32], spec: &ShadowSpec) -> Result<(), &'static str> {
    let bw = spec.canvas_width;
    let bh = spec.canvas_height;
    if bw == 0 || bw.checked_mul(bh) != Some(pixels.len()) {
        return Err("Invalid shadow buffer dimensions");
    }
    pixels.fill(0);
    let scale = spec.scale;
    let cx = bw as f64 / 2.0;
    let hw = spec.width * scale / 2.0;
    let hh = spec.height * scale / 2.0;
    let radius = spec.radius * scale;
    let margin = (48.0 * scale).ceil();
    let table1: [f64; 513] =
        std::array::from_fn(|i| gaussian((i as f64 - 256.0) / 4.0, 16.0 * scale));
    let table2: [f64; 513] =
        std::array::from_fn(|i| gaussian((i as f64 - 256.0) / 4.0, 3.0 * scale));
    let lookup =
        |table: &[f64; 513], d: f64| table[((d * 4.0).round() as i32 + 256).clamp(0, 512) as usize];
    let start = (cx - hw - margin).floor().max(0.0) as usize;
    let end = ((cx + hw + margin).ceil() as usize).min(bw);
    let bottom = bh.min(((spec.top + spec.height + 48.0) * scale).ceil() as usize);
    // IEEE-754 rounding can make the original bounds asymmetric by one pixel.
    // Preserve the full loop in that case; mirror only genuinely symmetric bounds.
    let mirrored = start == bw - end;
    let stop = if mirrored {
        end.min(bw.div_ceil(2))
    } else {
        end
    };
    for y in 0..bottom {
        let row = &mut pixels[y * bw..(y + 1) * bw];
        for x in start..stop {
            let d1 = distance(
                x as f64 + 0.5 - cx,
                y as f64 + 0.5 - (spec.top + 12.0) * scale - hh,
                hw - 4.0 * scale,
                hh - 4.0 * scale,
                (radius - 4.0 * scale).max(0.0),
            );
            let d2 = distance(
                x as f64 + 0.5 - cx,
                y as f64 + 0.5 - (spec.top + 2.0) * scale - hh,
                hw,
                hh,
                radius,
            );
            let a1 = 0.45 * lookup(&table1, d1);
            let a2 = 0.30 * lookup(&table2, d2);
            let value = ((1.0 - (1.0 - a1) * (1.0 - a2)) * spec.alpha * 255.0)
                .round()
                .clamp(0.0, 255.0) as u32;
            row[x] = value << 24;
            if mirrored {
                row[bw - 1 - x] = value << 24;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::performance_reference;

    #[test]
    fn mirrored_shadow_matches_original_pixels_at_fractional_scales_and_odd_widths() {
        for scale in [1.0, 1.25, 1.5, 1.75, 2.0, 2.25] {
            for (width, height, radius, top) in [
                (124.0, 32.0, 16.0, 0.0),
                (268.0, 36.0, 18.0, 0.0),
                (372.0, 88.0, 36.0, 0.0),
                (372.0, 168.0, 40.0, 8.0),
                (400.0, 280.0, 44.0, 0.0),
                (400.3, 580.7, 43.9, 7.8),
                (466.1, 170.3, 39.7, 0.2),
            ] {
                for alpha in [0.01, 0.483, 1.0] {
                    let spec = ShadowSpec {
                        canvas_width: (704.0_f64 * scale).ceil() as usize + 97,
                        canvas_height: (622.0_f64 * scale).ceil() as usize + 48,
                        scale,
                        width,
                        height,
                        radius,
                        top,
                        alpha,
                    };
                    let mut actual = vec![0; spec.canvas_width * spec.canvas_height];
                    let mut expected = actual.clone();
                    render(&mut actual, &spec).unwrap();
                    performance_reference::render_shadow(&mut expected, &spec);
                    assert_eq!(
                        actual, expected,
                        "scale={scale}, width={width}, height={height}, alpha={alpha}"
                    );
                }
            }
        }
    }

    #[test]
    fn invalid_buffer_is_rejected_without_a_panic() {
        let spec = ShadowSpec {
            canvas_width: 3,
            canvas_height: 2,
            scale: 1.0,
            width: 124.0,
            height: 32.0,
            radius: 16.0,
            top: 0.0,
            alpha: 1.0,
        };
        assert!(render(&mut [0; 5], &spec).is_err());
    }

    #[test]
    fn mirrored_shadow_preserves_bounds_next_to_a_floating_point_integer() {
        for scale in [1.0, 1.25, 1.5, 1.75, 2.0, 2.25] {
            for extra in [0, 1] {
                for bits in (372.0_f64.to_bits() - 2)..=(372.0_f64.to_bits() + 2) {
                    let spec = ShadowSpec {
                        canvas_width: (800.0_f64 * scale).ceil() as usize + extra,
                        canvas_height: (670.0_f64 * scale).ceil() as usize,
                        scale,
                        width: f64::from_bits(bits),
                        height: 168.0,
                        radius: 40.0,
                        top: 8.0,
                        alpha: 1.0,
                    };
                    let mut actual = vec![0; spec.canvas_width * spec.canvas_height];
                    let mut expected = actual.clone();
                    render(&mut actual, &spec).unwrap();
                    performance_reference::render_shadow(&mut expected, &spec);
                    assert_eq!(
                        actual.iter().zip(&expected).position(|(a, b)| a != b),
                        None,
                        "scale={scale}, extra={extra}, width={}",
                        spec.width
                    );
                }
            }
        }
    }
}
