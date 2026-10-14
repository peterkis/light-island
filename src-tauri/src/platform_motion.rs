//! Read-only Windows motion policy. Failed queries must keep system mode reduced.
#[cfg(any(target_os = "windows", test))]
fn query_animations(query: impl FnOnce(&mut i32) -> i32) -> bool {
    let mut enabled = 0_i32;
    query(&mut enabled) != 0 && enabled != 0
}

pub fn animations_enabled() -> bool {
    #[cfg(target_os = "windows")]
    {
        #[link(name = "user32")]
        extern "system" {
            fn SystemParametersInfoW(
                action: u32,
                param: u32,
                value: *mut std::ffi::c_void,
                flags: u32,
            ) -> i32;
        }
        query_animations(|enabled| unsafe {
            SystemParametersInfoW(0x1042, 0, (enabled as *mut i32).cast(), 0)
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::query_animations;

    #[test]
    fn a_failed_query_cannot_enable_motion_even_if_output_is_nonzero() {
        assert!(!query_animations(|enabled| {
            *enabled = 1;
            0
        }));
        assert!(!query_animations(|_| 0));
    }

    #[test]
    fn successful_disabled_query_keeps_motion_reduced() {
        assert!(!query_animations(|enabled| {
            *enabled = 0;
            1
        }));
    }

    #[test]
    fn only_successful_enabled_query_allows_system_motion() {
        assert!(query_animations(|enabled| {
            *enabled = 1;
            1
        }));
    }
}
