#![cfg(test)]

#[tokio::test]
#[ignore]
async fn github_repo_info_smoke() {
    // Requires GITHUB_TOKEN in env and network access
    use cortex_mcp_server::tool_handlers::github;
    let owner = std::env::var("SMOKE_GH_OWNER").unwrap_or_else(|_| "jamiescottcraik".into());
    let repo = std::env::var("SMOKE_GH_REPO").unwrap_or_else(|_| "Cortex-OS".into());
    let res = github::repo_info(owner, repo).await;
    assert!(res.is_error.unwrap_or(false) == false, "expected success, got error: {:?}", res);
}
