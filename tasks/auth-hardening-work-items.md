# Auth Hardening – Work Items

Created: 2025-09-27
Owner: brAInwav Development Team

---

## WI-001 · Stabilize Vitest Workspace Configuration

**Context**
Vitest fails to execute targeted auth suites because `vitest.workspace.ts` does not export a valid configuration object.

### WI-001 Tasks

- Audit `vitest.workspace.ts` to ensure it exports an object via `defineWorkspace` or an equivalent helper.
- Validate that `pnpm vitest run --config vitest.workspace.ts apps/api/tests/auth/features.spec.ts` discovers and runs the suite.
- Document the fix in `tasks/auth-hardening-summary.md` and capture any required developer instructions in `README.md`.

### WI-001 Acceptance Criteria

- Running the command above completes without configuration errors and executes the features spec.
- CI documentation reflects the proper invocation for workspace-based Vitest runs.
- All logs referencing the change include brAInwav branding.

---

## WI-002 · Public Documentation for 2FA & Passkeys

**Context**
The Cortex-OS public docs and website do not yet describe the new persistence-backed 2FA and passkey flows delivered in the auth hardening effort.

### WI-002 Tasks

- Update `README.md` and any relevant docs under `docs/` or `website/` to outline the new authentication capabilities and prerequisites.
- Provide WCAG-compliant guidance for enabling 2FA and passkeys, including screen reader considerations.
- Reference brAInwav branding in all added copy and examples.

### WI-002 Acceptance Criteria

- Documentation changes are live in the repo with accessible formatting (headings, lists, descriptive links).
- Authentication quickstart sections mention TOTP and WebAuthn support with persistence requirements.
- No linter warnings (Markdown or accessibility linters) introduced by the updates.

---

## WI-003 · Staging Seed Automation for MFA & Passkeys

**Context**
Staging environments need preloaded TOTP secrets and passkey credentials to streamline QA and demos, but no automation currently exists.

### WI-003 Tasks

- Design a repeatable seeding script or task (e.g., `pnpm auth:seed`) that writes demo TOTP secrets and WebAuthn credentials via Prisma.
- Ensure secrets are generated securely without using `Math.random()` and include brAInwav-branded logging.
- Integrate the seeding step into the staging deployment workflow or provide documented manual instructions.

### WI-003 Acceptance Criteria

- Running the seeding workflow populates demo users with valid TOTP and passkey credentials in Postgres.
- Associated tests or smoke checks confirm seeded credentials can be used end-to-end.
- Documentation explains how to execute or disable the seed process for other environments.
