---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## Initialization
```rust
let client = GithubClient::new("TOKEN")?;
```

## Repository API
- `repos().get(owner, repo)`
- `repos().list_org_repos(org)`

## Pull Request API
- `pull_requests().list(owner, repo)`
- `pull_requests().create(owner, repo, payload)`

Authentication uses personal access tokens via `Authorization: Bearer`.

```