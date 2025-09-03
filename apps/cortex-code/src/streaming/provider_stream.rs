//! Provider-agnostic streaming interface

use anyhow::Result;
use futures::{Stream, StreamExt};
use std::pin::Pin;

/// Trait for provider streaming capabilities
pub trait StreamingProvider {
    /// Create a stream for the given prompt
    fn stream(&self, prompt: &str) -> Pin<Box<dyn Stream<Item = Result<String>> + Send>>;
}

/// Wrapper for provider streams with error handling and buffering
pub struct ProviderStream<T> {
    provider: T,
    buffer_size: usize,
}

impl<T: StreamingProvider> ProviderStream<T> {
    /// Create a new provider stream wrapper
    pub fn new(provider: T, buffer_size: usize) -> Self {
        Self {
            provider,
            buffer_size,
        }
    }

    /// Create a buffered stream with error recovery
    pub fn create_stream(&self, prompt: &str) -> Pin<Box<dyn Stream<Item = Result<String>> + Send>> {
        let stream = self.provider.stream(prompt);

        // Add buffering and error recovery
        let buffered_stream = stream
            .chunks(self.buffer_size)
            .map(|chunk_results| {
                let mut combined = String::new();
                for result in chunk_results {
                    match result {
                        Ok(content) => combined.push_str(&content),
                        Err(e) => return Err(e),
                    }
                }
                Ok(combined)
            })
            .filter_map(|result| async move {
                match result {
                    Ok(content) if !content.is_empty() => Some(Ok(content)),
                    Ok(_) => None, // Skip empty chunks
                    Err(e) => Some(Err(e)),
                }
            });

        Box::pin(buffered_stream)
    }
}

/// Mock streaming provider for testing
#[cfg(test)]
pub struct MockStreamingProvider {
    pub responses: Vec<String>,
    pub delay_ms: u64,
}

#[cfg(test)]
impl MockStreamingProvider {
    pub fn new(responses: Vec<String>, delay_ms: u64) -> Self {
        Self { responses, delay_ms }
    }
}

#[cfg(test)]
impl StreamingProvider for MockStreamingProvider {
    fn stream(&self, _prompt: &str) -> Pin<Box<dyn Stream<Item = Result<String>> + Send>> {
        let responses = self.responses.clone();
        let delay = std::time::Duration::from_millis(self.delay_ms);

        let stream = futures::stream::iter(responses)
            .then(move |response| async move {
                if delay.as_millis() > 0 {
                    tokio::time::sleep(delay).await;
                }
                Ok(response)
            });

        Box::pin(stream)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockStreamingProvider::new(
            vec!["Hello".to_string(), " ".to_string(), "World".to_string()],
            10
        );

        let mut stream = provider.stream("test prompt");
        let mut results = Vec::new();

        while let Some(result) = stream.next().await {
            results.push(result.unwrap());
        }

        assert_eq!(results, vec!["Hello", " ", "World"]);
    }

    #[tokio::test]
    async fn test_provider_stream_wrapper() {
        let provider = MockStreamingProvider::new(
            vec!["Hello".to_string(), " ".to_string(), "World".to_string()],
            5
        );

        let wrapper = ProviderStream::new(provider, 2);
        let mut stream = wrapper.create_stream("test");

        let mut results = Vec::new();
        while let Some(result) = stream.next().await {
            results.push(result.unwrap());
        }

        // Results should be chunked and combined
        assert!(!results.is_empty());
    }
}
