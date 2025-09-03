use cortex_github::{GitHubServiceFactory, PRListOptions};
use mcp_types::{CallToolResult, ContentBlock, TextContent};

pub async fn repo_info(owner: String, repo: String) -> CallToolResult {
    let client = match GitHubServiceFactory::create_for_mcp().await {
        Ok(c) => c,
        Err(e) => {
            return CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: format!("GitHub auth/config error: {e}"), annotations: None })],
                is_error: Some(true),
                structured_content: None,
            };
        }
    };

    match client.repository_api().get_repository(&owner, &repo).await {
        Ok(info) => CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: serde_json::to_string_pretty(&info).unwrap_or_else(|_| "{}".into()), annotations: None })],
            is_error: Some(false),
            structured_content: Some(serde_json::to_value(info).ok()),
        },
        Err(e) => CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: format!("Failed to fetch repo: {e}"), annotations: None })],
            is_error: Some(true),
            structured_content: None,
        },
    }
}

pub async fn list_prs(owner: String, repo: String, state: Option<String>, per_page: Option<u32>) -> CallToolResult {
    let client = match GitHubServiceFactory::create_for_mcp().await {
        Ok(c) => c,
        Err(e) => {
            return CallToolResult {
                content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: format!("GitHub auth/config error: {e}"), annotations: None })],
                is_error: Some(true),
                structured_content: None,
            };
        }
    };

    let mut opts = PRListOptions::default();
    if let Some(s) = state { opts.state = Some(s); }
    if let Some(pp) = per_page { opts.per_page = pp; }

    match client.pull_requests_api().list_pull_requests(&owner, &repo, Some(opts)).await {
        Ok(prs) => CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: format!("{} PR(s)", prs.len()), annotations: None })],
            is_error: Some(false),
            structured_content: Some(serde_json::to_value(prs).ok()),
        },
        Err(e) => CallToolResult {
            content: vec![ContentBlock::TextContent(TextContent { r#type: "text".into(), text: format!("Failed to list PRs: {e}"), annotations: None })],
            is_error: Some(true),
            structured_content: None,
        },
    }
}
