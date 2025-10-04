# Documentation Fix Patches

## 1. Fix GitHub Repository URLs

Replace all placeholder GitHub URLs with actual repository:

```diff
--- a/README.md
+++ b/README.md
@@ -47,1 +47,1 @@
-git clone https://github.com/cortex-os/cortex-os.git
+git clone https://github.com/[ACTUAL-ORG]/cortex-os.git

--- a/CONTRIBUTING.md  
+++ b/CONTRIBUTING.md
@@ -19,1 +19,1 @@
-git clone https://github.com/cortex-os/cortex-os.git
+git clone https://github.com/[ACTUAL-ORG]/cortex-os.git
```

## 2. Fix Security Contact Information

Either provide real contact info or remove placeholder:

```diff
--- a/SECURITY.md
+++ b/SECURITY.md
@@ -43,1 +43,1 @@
-- **Emergency Contact**: +1-XXX-XXX-XXXX (for critical vulnerabilities only)
++ **Emergency Contact**: security@[ACTUAL-DOMAIN].com

@@ -106,4 +106,4 @@
-```
------BEGIN PGP PUBLIC KEY BLOCK-----
-[PGP key will be provided here - placeholder for actual implementation]
------END PGP PUBLIC KEY BLOCK-----
+```  
+-----BEGIN PGP PUBLIC KEY BLOCK-----
+[ACTUAL PGP PUBLIC KEY HERE]
+-----END PGP PUBLIC KEY BLOCK-----
```

## 3. Fix Package Version Inconsistencies

Ensure pnpm version consistency:

```diff
--- a/README.md
+++ b/README.md
@@ -7,1 +7,1 @@
-[![Package Manager](https://img.shields.io/badge/pnpm-v9.9.0-blue)](https://pnpm.io/)
+[![Package Manager](https://img.shields.io/badge/pnpm-9.9.0%20exact-blue)](https://pnpm.io/)

@@ -42,1 +42,1 @@
-- **pnpm** 9.9.0 (exact version required)
++ **pnpm** 9.9.0 exactly (as specified in package.json)
```

## 4. Remove Non-Existent Package References

Remove or fix references to missing packages:

```diff
--- a/README.md
+++ b/README.md
@@ -160,2 +160,0 @@
-| Package                                          | Description                  | Documentation                                   |
-| [cortex-ai-github](./packages/cortex-ai-github/) | AI-powered GitHub automation | [README](./packages/cortex-ai-github/README.md) |
```

## 5. Fix Support Contact Placeholders

Replace with actual support infrastructure:

```diff
--- a/README.md
+++ b/README.md
@@ -311,4 +311,4 @@
-- **📧 Email**: support@cortex-os.dev
-- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
-- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
-- **📖 Documentation**: [docs.cortex-os.dev](https://docs.cortex-os.dev)
++ **📧 Email**: support@[ACTUAL-DOMAIN].com  
++ **💬 Discussions**: [GitHub Discussions](https://github.com/[ACTUAL-ORG]/cortex-os/discussions)
++ **🐛 Issues**: [GitHub Issues](https://github.com/[ACTUAL-ORG]/cortex-os/issues)
++ **📖 Documentation**: [ACTUAL-DOCS-SITE]
```

## 6. Remove Duplicate Content

Clean up duplicate headings:

```diff
--- a/packages/agents/README.md
+++ b/packages/agents/README.md
@@ -181,1 +181,0 @@
-
-# @cortex-os/agents
```

## 7. Fix Environment Configuration References (App Removed)

Note: This referenced a deleted app (cortex-webui).

```diff  
--- a/apps/cortex-webui/README.md (DELETED)
+++ b/apps/cortex-webui/README.md (DELETED)
@@ -34,1 +34,1 @@
-Set the following environment variables (see repo `.env.example`):
+Set the following environment variables (create `.env` file in project root):
```

## 8. Remove Hardcoded Deployment Values

Make deployment instructions generic:

```diff
--- a/packages/mcp-server/README.md
+++ b/packages/mcp-server/README.md
@@ -140,4 +140,4 @@
-1. Ensure you have a Cloudflare Tunnel configured with:
-   - Tunnel UUID: `af4eed03-2d4e-4683-8cb7-6d4b8e47b564`
-   - Hostname: `mcp.brainwav.io`  
-   - Service: `http://localhost:3000`
+1. Configure your Cloudflare Tunnel with:
+   - Tunnel UUID: `[YOUR-TUNNEL-UUID]`
+   - Hostname: `[YOUR-HOSTNAME]`
+   - Service: `http://localhost:3000`
```

## 9. Remove Hardcoded Dates

Use dynamic versioning:

```diff
--- a/CODE_OF_CONDUCT.md
+++ b/CODE_OF_CONDUCT.md
@@ -275,2 +275,1 @@
-**Last Updated**: September 1, 2025  
-**Version**: 1.0
+**Version**: 1.0

--- a/SECURITY.md  
+++ b/SECURITY.md
@@ -520,1 +520,0 @@
-**Last Updated**: September 1, 2025 | **Version**: 1.0
```

## 10. Validate All External Links

Script to check external links:

```bash
#!/bin/bash
# Add to CI/CD pipeline
find . -name "*.md" -exec grep -l "http" {} \; | \
  xargs grep -o 'https\?://[^)]*' | \
  sort -u | \
  xargs -I {} curl -Is {} | \
  grep "HTTP"
```
