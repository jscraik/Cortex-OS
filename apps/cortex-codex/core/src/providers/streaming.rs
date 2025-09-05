//! Generic streaming utilities (SSE parsing, reconnection) for providers.
//!
//! This is intentionally minimal right now: it wraps an HTTP GET request that
//! returns Server Sent Events and converts them into `StreamEvent`s consumed by
//! higher level provider implementations. Reconnection and advanced retry
//! policies can be layered in later.

use crate::error::Result;
use crate::providers::ProviderError;
use crate::providers::traits::{BoxStream, StreamEvent, StreamResult};
use eventsource_stream::Eventsource;
use futures::StreamExt;
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Client, Response};

/// Basic SSE transformer configuration.
pub struct SseConfig<'a> {
    pub url: &'a str,
    pub api_key: Option<&'a str>,
    /// If provider requires POST with JSON body to initiate the stream.
    pub json_body: Option<String>,
}

/// Initiate an SSE stream. This function decides between POST/GET based on
/// presence of `json_body` and sets standard headers. Providers may wrap this
/// and apply provider-specific header additions.
pub async fn start_sse(config: SseConfig<'_>) -> Result<Response> {
    let client = Client::new();
    let mut req = if let Some(body) = &config.json_body {
        client
            .post(config.url)
            .header(CONTENT_TYPE, "application/json")
            .body(body.clone())
    } else {
        client.get(config.url)
    };

    req = req.header(ACCEPT, "text/event-stream");
    if let Some(key) = config.api_key {
        req = req.header(AUTHORIZATION, format!("Bearer {}", key));
    }

    let resp = req.send().await.map_err(ProviderError::from)?;
    if !resp.status().is_success() {
        return Err(ProviderError::Protocol {
            message: format!("non-success status: {}", resp.status()),
        }
        .into());
    }
    Ok(resp)
}

/// Convert an SSE HTTP response into a boxed stream of `StreamResult` where
/// each incoming SSE `data:` line becomes either a token delta or a Finished
/// event if the provider signals termination via `[DONE]` sentinel.
pub fn sse_into_stream(resp: Response) -> BoxStream<'static, StreamResult> {
    let stream = resp.bytes_stream().eventsource().scan(0usize, |idx, evt| {
        let mapped: StreamResult = match evt {
            Ok(event) => {
                let data = event.data;
                let i = *idx;
                if data.trim() == "[DONE]" {
                    *idx += 1;
                    Ok(StreamEvent::Finished {
                        full: String::new(),
                        usage: None,
                    })
                } else {
                    *idx += 1;
                    Ok(StreamEvent::Token {
                        text: data,
                        index: i,
                    })
                }
            }
            Err(e) => Err(ProviderError::Network {
                message: e.to_string(),
            }
            .into()),
        };
        futures::future::ready(Some(mapped))
    });

    Box::pin(stream)
}

// Placeholder for future: reconnection wrapper that takes a closure to
// re-establish the SSE stream and stitches events while preserving index.
