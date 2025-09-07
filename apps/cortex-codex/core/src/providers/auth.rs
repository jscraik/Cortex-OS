//! Auth helper utilities for providers (Task 2.2a minimal)
use http::HeaderMap;

/// Apply a bearer Authorization header if an API key is provided.
pub fn apply_bearer_auth(headers: &mut HeaderMap, api_key: Option<&str>) {
    if let Some(k) = api_key {
        headers.insert("Authorization", format!("Bearer {k}").parse().unwrap());
    }
}
