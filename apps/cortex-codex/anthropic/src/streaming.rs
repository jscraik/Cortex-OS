//! Streaming implementation for Anthropic API

use crate::error::AnthropicError;
use crate::models::{AnthropicStreamEvent, AnthropicUsage};
use eventsource_stream::Eventsource;
use futures::{Stream, StreamExt};
use reqwest::Response;
use std::pin::Pin;
use std::task::{Context, Poll};
use tracing::{debug, error};

/// Stream of events from Anthropic API
pub struct AnthropicStream {
    inner: Pin<Box<dyn Stream<Item = Result<AnthropicStreamEvent, AnthropicError>> + Send>>,
    buffer: String,
    usage: Option<AnthropicUsage>,
    finished: bool,
}

impl AnthropicStream {
    /// Create a new stream from an HTTP response
    pub fn new(response: Response) -> Self {
        let stream = response
            .bytes_stream()
            .eventsource()
            .map(move |result| match result {
                Ok(event) => {
                    let data = event.data;
                    if data.trim().is_empty() {
                        return Ok(AnthropicStreamEvent::Ping);
                    }

                    match serde_json::from_str::<AnthropicStreamEvent>(&data) {
                        Ok(stream_event) => {
                            debug!("Received Anthropic stream event: {:?}", stream_event);
                            Ok(stream_event)
                        }
                        Err(e) => {
                            error!(
                                "Failed to parse Anthropic stream event: {} - Data: {}",
                                e, data
                            );
                            Ok(AnthropicStreamEvent::Error {
                                error: crate::models::ErrorContent {
                                    error_type: "parse_error".to_string(),
                                    message: format!("Failed to parse event: {}", e),
                                },
                            })
                        }
                    }
                }
                Err(e) => {
                    error!("Anthropic stream error: {}", e);
                    Err(AnthropicError::StreamError(e.to_string()))
                }
            });

        Self {
            inner: Box::pin(stream),
            buffer: String::new(),
            usage: None,
            finished: false,
        }
    }

    /// Get the accumulated text content
    pub fn accumulated_text(&self) -> &str {
        &self.buffer
    }

    /// Get the usage statistics (available after stream completion)
    pub fn usage(&self) -> Option<&AnthropicUsage> {
        self.usage.as_ref()
    }

    /// Check if the stream has finished
    pub fn is_finished(&self) -> bool {
        self.finished
    }
}

impl Stream for AnthropicStream {
    type Item = Result<AnthropicStreamEvent, AnthropicError>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.finished {
            return Poll::Ready(None);
        }

        match self.inner.as_mut().poll_next(cx) {
            Poll::Ready(Some(Ok(event))) => {
                match &event {
                    AnthropicStreamEvent::ContentBlockDelta { delta, .. } => {
                        if let Some(text) = &delta.text {
                            self.buffer.push_str(text);
                        }
                    }
                    AnthropicStreamEvent::MessageDelta { usage, .. } => {
                        self.usage = Some(usage.clone());
                    }
                    AnthropicStreamEvent::MessageStop => {
                        self.finished = true;
                    }
                    AnthropicStreamEvent::Error { error } => {
                        error!("Anthropic API error in stream: {}", error.message);
                        self.finished = true;
                    }
                    _ => {}
                }
                Poll::Ready(Some(Ok(event)))
            }
            Poll::Ready(Some(Err(e))) => {
                self.finished = true;
                Poll::Ready(Some(Err(e)))
            }
            Poll::Ready(None) => {
                self.finished = true;
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}
