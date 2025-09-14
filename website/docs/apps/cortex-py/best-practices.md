---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Pre-cache model weights on machines with network access to avoid downloads in CI.
- Use small local models for quick tests; set `MLX_LOCAL_MODEL_PATH` to the model directory.
- Normalize embeddings unless your downstream system handles normalization.
- Pin model versions and record checksums for reproducible pipelines.
