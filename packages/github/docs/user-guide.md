# User Guide

Common tasks:

### Create Pull Request
```rust
let new_pr = octocrab::models::pulls::PullRequest {
    title: String::from("Add new feature"),
    body: Some(String::from("This pull request adds a new feature.")),
    head: String::from("feature-branch"),
    base: String::from("main"),
    ..Default::default()
};
let pr = client.pull_requests()
    .create("Cortex-OS", "Cortex-OS", &new_pr)
    .await?;

Keyboard shortcuts are not applicable.

### Verify Webhook
```rust
client.auth().verify(&payload, &signature)?;
```
