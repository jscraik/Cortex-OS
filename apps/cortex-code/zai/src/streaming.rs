//! Streaming implementation for Z.ai API

use crate::error::ZaiError;
use crate::models::{ZaiStreamEvent, ZaiUsage};
use eventsource_stream::Eventsource;
use futures::{Stream, StreamExt};
use reqwest::Response;
use std::pin::Pin;
use std::task::{Context, Poll};
use tracing::{debug, error};

/// Stream of events from Z.ai API
pub struct ZaiStream {
    inner: Pin<Box<dyn Stream<Item = Result<ZaiStreamEvent, ZaiError>> + Send>>,
    buffer: String,
    usage: Option<ZaiUsage>,
    finished: bool,
}

impl ZaiStream {
    /// Create a new stream from an HTTP response
    pub fn new(response: Response) -> Self {
        let stream = response.bytes_stream().eventsource().map(move |result| {
            match result {
                Ok(event) => {
                    let data = event.data;
                    if data.trim().is_empty() {
                        return Ok(ZaiStreamEvent::Ping);
                    }

                    // Handle the special [DONE] marker
                    if data.trim() == "[DONE]" {
                        return Ok(ZaiStreamEvent::MessageStop);
                    }

                    match serde_json::from_str::<ZaiStreamEvent>(&data) {
                        Ok(stream_event) => {
                            debug!("Received Z.ai stream event: {:?}", stream_event);
                            Ok(stream_event)
                        }
                        Err(e) => {
                            error!("Failed to parse Z.ai stream event: {} - Data: {}", e, data);
                            Ok(ZaiStreamEvent::Error {
                                error: crate::models::ErrorContent {
                                    error_type: "parse_error".to_string(),
                                    message: format!("Failed to parse event: {}", e),
                                },
                            })
                        }
                    }
                }
                Err(e) => {
                    error!("Z.ai stream error: {}", e);
                    Err(ZaiError::StreamError(e.to_string()))
                }
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
    pub fn usage(&self) -> Option<&ZaiUsage> {
        self.usage.as_ref()
    }

    /// Check if the stream has finished
    pub fn is_finished(&self) -> bool {
        self.finished
    }
}

impl Stream for ZaiStream {
    type Item = Result<ZaiStreamEvent, ZaiError>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.finished {
            return Poll::Ready(None);
        }

        match self.inner.as_mut().poll_next(cx) {
            Poll::Ready(Some(Ok(event))) => {
                match &event {
                    ZaiStreamEvent::ContentDelta { delta, .. } => {
                        if let Some(text) = &delta.text {
                            self.buffer.push_str(text);
                        }
                    }
                    ZaiStreamEvent::MessageDelta { usage, .. } => {
                        self.usage = Some(usage.clone());
                    }
                    ZaiStreamEvent::MessageStop => {
                        self.finished = true;
                        debug!(
                            "Z.ai stream finished. Total text length: {}",
                            self.buffer.len()
                        );
                    }
                    ZaiStreamEvent::Error { error } => {
                        error!("Z.ai API error in stream: {}", error.message);
                        self.finished = true;
                    }
                    ZaiStreamEvent::Ping => {
                        // Ping events don't affect state
                    }
                    ZaiStreamEvent::MessageStart { .. } => {
                        debug!("Z.ai message started");
                    }
                }
                Poll::Ready(Some(Ok(event)))
            }
            Poll::Ready(Some(Err(e))) => {
                self.finished = true;
                Poll::Ready(Some(Err(e)))
            }
            Poll::Ready(None) => {
                self.finished = true;
                debug!("Z.ai stream ended naturally");
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

// Note: Mock stream creation should be implemented in integration tests
// using proper HTTP mocking libraries like wiremock when needed
