//! Extension crate for provider implementations external to the upstream
//! codex-core. This keeps upstream crates clean while allowing
//! Cortex-specific providers to evolve independently.

pub mod providers;
pub use providers::*;

/// Register the default external providers into an existing registry.
/// This keeps upstream crates untouched while allowing additive providers.
pub fn register_default_ext_providers(reg: &mut codex_core::providers::ProviderRegistry) {
    use providers::anthropic::AnthropicProvider;
    use providers::zai::ZaiProvider;
    use std::sync::Arc;

    let anth = Arc::new(AnthropicProvider::new());
    reg.register_arc(anth);
    let zai = Arc::new(ZaiProvider::new());
    reg.register_arc(zai);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn can_construct_registry() {
        let reg = ProviderRegistry::new();
        assert!(reg.list_providers().is_empty());
    }
}
