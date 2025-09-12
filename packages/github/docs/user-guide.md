# User Guide

Common tasks:

### Create Pull Request
```rust
let pr = client.pull_requests()
    .create("Cortex-OS", "Cortex-OS", &new_pr)
    .await?;
```

Keyboard shortcuts are not applicable.

### Verify Webhook
```rust
client.auth().verify(&payload, &signature)?;
```
