---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

### List Organization Repositories
```rust
let repos = client.repos().list_org_repos("Cortex-OS").await?;
for repo in repos {
    println!("{}", repo.name);
}
```

More examples will be added as features expand.

```