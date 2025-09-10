//! Extension crate for provider abstractions.
//!
//! Stage 2: Thin re-exports of the local core providers module so downstream
//! crates can depend on a stable facade. A later stage will migrate
//! implementation details here while keeping upstream `codex-core` pristine.

pub use codex_core::providers::*;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn can_list_providers_from_registry() {
        let reg = ProviderRegistry::new();
        assert!(reg.list_providers().is_empty());
    }
}
