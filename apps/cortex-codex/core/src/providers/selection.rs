//! Provider selection extension trait (Task 2.2a)
//! Provides registry-based resolution by explicit provider or model name.

use super::{ModelProvider, ProviderError, ProviderRegistry};
use crate::error::Result;
use std::sync::Arc;

pub trait SelectProviderExt {
    fn select_provider(
        &self,
        provider: Option<&str>,
        model: Option<&str>,
    ) -> Result<Arc<dyn ModelProvider>>;
}

impl SelectProviderExt for ProviderRegistry {
    fn select_provider(
        &self,
        provider: Option<&str>,
        model: Option<&str>,
    ) -> Result<Arc<dyn ModelProvider>> {
        if self.is_empty() {
            return Err(ProviderError::NoProvidersRegistered.into());
        }

        if let Some(name) = provider {
            let p = self.get_arc(name).ok_or_else(|| {
                ProviderError::UnknownProvider {
                    provider: name.to_string(),
                }
            })?;
            if let Some(m) = model {
                let models = futures::executor::block_on(p.available_models())?;
                if !models.iter().any(|mm| mm == m) {
                    return Err(ProviderError::ModelNotSupported {
                        model: m.to_string(),
                    }
                    .into());
                }
            }
            return Ok(p);
        }

        if let Some(m) = model {
            for name in self.list_providers() {
                if let Some(p) = self.get_arc(&name) {
                    if let Ok(models) = futures::executor::block_on(p.available_models()) {
                        if models.iter().any(|mm| mm == m) {
                            return Ok(p);
                        }
                    }
                }
            }
            return Err(ProviderError::ModelNotSupported {
                model: m.to_string(),
            }
            .into());
        }

        if let Some(def) = self.get_default() {
            return Ok(self.get_arc(def.name()).unwrap());
        }

        Err(ProviderError::NoResolutionPath.into())
    }
}
