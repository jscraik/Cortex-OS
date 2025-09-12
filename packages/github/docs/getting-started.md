# Getting Started

## Prerequisites
- Rust 1.70+ and Cargo
- GitHub personal access token with required scopes

## Installation
Add to `Cargo.toml`:

```toml
[dependencies]
cortex-github = "1.0"
```

## First Request
```rust
use cortex_github::client::GithubClient;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let client = GithubClient::new("ghp_token")?;
    let repo = client.repos().get("Cortex-OS", "Cortex-OS").await?;
    println!("{}", repo.full_name);
    Ok(())
}
```
