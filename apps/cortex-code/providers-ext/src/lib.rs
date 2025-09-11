//! Extension crate for provider implementations external to the upstream
//! codex-core. This keeps upstream crates clean while allowing
//! Cortex-specific providers to evolve independently.

pub mod providers;
pub use providers::*;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn can_construct_registry() {
        let reg = ProviderRegistry::new();
        assert!(reg.list_providers().is_empty());
    }
}
