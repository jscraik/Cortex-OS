---
title: Faq
sidebar_label: Faq
---

# FAQ

**How do I regenerate the access token?**
Delete the token file in the XDG state directory and restart the runtime.

**Why does the server bind only to 127.0.0.1?**
ASBR is designed for local-first deployments. Use a reverse proxy if remote access is required.

**Where are artifacts stored?**
Under `~/.local/share/cortex/asbr/artifacts` organized by date and UUID.
