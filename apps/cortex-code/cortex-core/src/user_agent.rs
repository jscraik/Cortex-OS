const DEFAULT_ORIGINATOR: &str = "cortex_cli_rs";

pub fn get_cortex_user_agent(originator: Option<&str>) -> String {
    let build_version = env!("CARGO_PKG_VERSION");
    let os_info = os_info::get();
    format!(
        "{}/{build_version} ({} {}; {}) {}",
        originator.unwrap_or(DEFAULT_ORIGINATOR),
        os_info.os_type(),
        os_info.version(),
        os_info.architecture().unwrap_or("unknown"),
        crate::terminal::user_agent()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_cortex_user_agent() {
        let user_agent = get_cortex_user_agent(None);
        assert!(user_agent.starts_with("cortex_cli_rs/"));
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn test_macos() {
        use regex_lite::Regex;
        let user_agent = get_cortex_user_agent(None);
        let re = Regex::new(
            r"^cortex_cli_rs/\d+\.\d+\.\d+ \(Mac OS \d+\.\d+\.\d+; (x86_64|arm64)\) (\S+)$",
        )
        .unwrap();
        assert!(re.is_match(&user_agent));
    }
}
