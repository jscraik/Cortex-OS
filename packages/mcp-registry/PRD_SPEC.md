# MCP Registry PRD & Technical Specification

## Product Requirements
- **Goal**: Provide a secure, versioned registry for MCP server manifests.
- **Non-goals**: Hosting binaries or performing execution of servers.
- **Personas**: Tool publishers, registry operators, MCP clients.
- **Functional Requirements**:
  - Validate server manifests against JSON Schema 2020-12.
  - Sign registry indices with Sigstore and verify on install.
  - Support SemVer versioning and deprecation windows.
  - Provide CLI and HTTP API for register, resolve, deprecate, yank, migrate.
- **Success Metrics**: ≥95% test coverage, signed releases, <200ms resolve latency.

## Technical Spec
- **Schemas**: Stored under `schemas/` using JSON Schema 2020-12; versioned via content-addressed digests.
- **Storage**: Content-addressed filesystem adapter with SHA256 checksums; pluggable adapters for S3 and git.
- **API**: HTTP OpenAPI 3.1 endpoints for publish and query; AsyncAPI 2.0 events for updates.
- **Auth**: OAuth2 with scopes, per-tenant quotas and rate limits; RBAC for publish vs read.
- **Security**: All artifacts signed with Sigstore; provenance verified at install (SLSA level 3).
- **Observability**: Structured logs with ULIDs, Prometheus metrics, and OpenTelemetry traces.
- **Release**: SemVer tags, SBOM (SPDX), cosign signatures, and in-toto provenance.
- **Rollback**: Preserve previous registry snapshots and allow client pinning by digest.
