---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-edm-react-email-tool-2026-07-28/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/solution-design.md
---

# EDM React Email Tool - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the EDM React Email Tool, decomposing the requirements from the authentication PRD and the technical architecture (spine + solution design) into implementable stories.

Scope note: the authentication PRD is the only product-requirements input and its implementation is **deferred**. The architecture (modular monolith, ports-and-adapters, hybrid persistence, worker boundary) is therefore the primary driver of near-term epics. Authentication requirements are carried as a reserved, later epic so the seam is built but not enabled until external exposure is planned.

## Requirements Inventory

### Functional Requirements

Source: authentication PRD. Implementation deferred; carried for the reserved auth epic.

FR1: Require authentication for all application pages except sign-in, auth callback, access-denied, and designated public health endpoints. (PRD FR-1.1)
FR2: Require authentication for template, registry, render, export, send, upload, Figma, and AI API routes. (PRD FR-1.2)
FR3: Authenticate via an organization-approved identity source. (PRD FR-1.3)
FR4: Grant access only to identities satisfying the configured org/allowlist policy. (PRD FR-1.4)
FR5: Provide no public self-registration. (PRD FR-1.5)
FR6: On successful sign-in, establish a secure session and return the user to the originally requested valid route. (PRD FR-1.6)
FR7: On failed/disallowed sign-in, create no session and show an actionable, non-sensitive error. (PRD FR-1.7)
FR8: Keep a session valid across navigation/refresh until expiry, revocation, or sign-out. (PRD FR-2.1)
FR9: Sign-out invalidates the session and redirects to sign-in. (PRD FR-2.2)
FR10: Reject expired/invalid sessions at both page and API access controls. (PRD FR-2.3)
FR11: Preserve a safe return destination through sign-in; reject external/malformed redirects. (PRD FR-2.4)
FR12: Warn an active editor before foreseeable session expiry when unsaved work exists. (PRD FR-2.5)
FR13: Assign every authenticated user a Member or Administrator role. (PRD FR-3.1)
FR14: Enforce authorization server-side for every privileged operation. (PRD FR-3.2)
FR15: Hide administrator-only controls from Members (never the enforcement mechanism). (PRD FR-3.3)
FR16: Return access-denied and perform no operation for insufficient privileges. (PRD FR-3.4)
FR17: Revoked/disabled users lose access within the configured revocation interval. (PRD FR-3.5)
FR18: Protected API routes return 401 when unauthenticated. (PRD FR-4.1)
FR19: Protected API routes return 403 when authenticated but unauthorized. (PRD FR-4.2)
FR20: Authentication errors use a consistent JSON response shape. (PRD FR-4.3)
FR21: Responses disclose no tokens, provider details, stack traces, env values, or identity existence. (PRD FR-4.4)
FR22: Protect browser-initiated state-changing requests against CSRF. (PRD FR-4.5)
FR23: Run existing input validation after auth/authz checks. (PRD FR-4.6)
FR24: Provide sign-in, sign-out, access-denied, and session-expired experiences. (PRD FR-5.1)
FR25: Show enough identity info in the shell to confirm the active account. (PRD FR-5.2)
FR26: On auth failure, never discard a loaded template or falsely report a save as successful. (PRD FR-5.3)
FR27: On session-expiry API failure, stop protected follow-ups and prompt reauthentication. (PRD FR-5.4)
FR28: Authentication does not change exported email content/rendering. (PRD FR-5.5)
FR29: Record acting user on created/updated templates where storage supports it. (PRD FR-6.1)
FR30: Record sign-ins, sign-outs, access denials, and admin access changes with timestamp and identity. (PRD FR-6.2)
FR31: Exclude credentials, session tokens, and template content from auth event records. (PRD FR-6.3)
FR32: Let operators correlate a failed protected request with an auth event without exposing sensitive detail. (PRD FR-6.4)
FR33: Require authentication for asset upload and asset-management operations. (PRD FR-7.1)
FR34: Define whether uploaded asset URLs are public, authenticated, or bundled before deployment. (PRD FR-7.2)
FR35: Ensure sent-email hosted assets remain loadable by intended recipients. (PRD FR-7.3)
FR36: Keep exported ZIPs self-contained per existing behavior. (PRD FR-7.4)

### NonFunctional Requirements

Source: authentication PRD.

NFR1: Secure, HTTP-only, same-site session cookies in production. (PRD NFR-1)
NFR2: Auth secrets/credentials remain server-side; never in client bundles, logs, or responses. (PRD NFR-2)
NFR3: HTTPS for production traffic. (PRD NFR-3)
NFR4: Protect sign-in/callback against replay, redirect, fixation, and CSRF attacks. (PRD NFR-4)
NFR5: Maintain auth dependencies at supported versions; review for critical CVEs before release. (PRD NFR-5)
NFR6: Support identity-provider MFA; may be enforced by org policy. (PRD NFR-6)
NFR7: Auth checks add <=200ms p95 to normal same-region API requests (excludes interactive sign-in). (PRD NFR-7)
NFR8: Avoid a remote IdP round-trip on every builder interaction when local validation exists. (PRD NFR-8)
NFR9: Fail closed: protected content/actions unavailable when session validity is unknown. (PRD NFR-9)
NFR10: IdP outages never corrupt templates or report failed saves as successful. (PRD NFR-10)
NFR11: Provide a clear recoverable state when auth services are unavailable. (PRD NFR-11)
NFR12: Auth screens/controls meet keyboard nav, visible focus, labels, WCAG 2.1 AA contrast. (PRD NFR-12)
NFR13: Error messages are understandable without exposing security-sensitive detail. (PRD NFR-13)
NFR14: Auth events are structured and timestamped. (PRD NFR-14)
NFR15: Logs use minimum personal info needed for access control and troubleshooting. (PRD NFR-15)
NFR16: Retention/deletion periods for auth events are configurable per org policy. (PRD NFR-16)

### Additional Requirements

Source: architecture spine (AD-n) and solution design build order. These drive the near-term epics.

- AR1 (AD-1): Next.js is the only HTTP boundary; route handlers validate → call a service → shape response, holding no business logic.
- AR2 (AD-2): Persistence reached only through `TemplateRepository`, `AssetStore`, `EventLog` ports; no direct `fs`/DB/S3 calls outside adapters.
- AR3 (AD-3): A single composition root (`container.ts`) binds adapters by `STORAGE_DRIVER`/`ASSET_DRIVER`; local may use filesystem/local, shared/prod must use postgres/s3.
- AR4 (AD-4): `emailTemplateDocumentSchema` is the single persisted-shape source of truth; shape changes bump `SCHEMA_VERSION` with a forward migration; adapters never persist unvalidated documents.
- AR5 (AD-5): The component registry is the single source of truth for blocks; legacy `src/emails/*` stays demo-only, not a second registry.
- AR6 (AD-6): All HTML rendering is server-side through `DynamicEmailTemplate`; export/send render with `editable` omitted.
- AR7 (AD-7): Long-running work (export, Figma import/build, AI analysis) crosses a `JobQueue` boundary; API returns a job handle; local may run in-process, shared/prod must use a durable queue.
- AR8 (AD-8): Every protected route validates input with Zod before side effects.
- AR9 (AD-9): Errors cross the boundary as `{ error: { code, message } }`; no internals leak; correlation-id keyed server logs.
- AR10 (AD-10): A single server-side access gate (middleware + `requireAccess()`) wraps protected routes/pages; `AUTH_MODE=open` locally, `AUTH_MODE=enforced` required and blocking for external exposure.
- AR11 (AD-11): Secrets/infrastructure credentials are server-only, read inside adapters, never in client modules or responses.
- AR12: Introduce Postgres schema (`templates`, `assets`, `events`) with `document` jsonb as source of truth plus projection columns and a `revision` column for optimistic concurrency (stale write → 409).
- AR13: Provide a one-time JSON→DB import script reusing `emailTemplateDocumentSchema`.
- AR14: Add S3-compatible asset adapter with upload hardening (content-type allowlist, size limits, UUID object keys) and a defined asset-delivery policy.
- AR15: Add a background-worker runtime and `GET /api/jobs/[id]` status contract; async POSTs return 202 + jobId.
- AR16: Add `config.ts` typed env validation loaded once at startup.
- AR17: Establish a test/lint/format baseline (none exists today).
- AR18: Track maintenance upgrades: Next.js 14→16 (security fixes) and PostgreSQL version (avoid 14, EOL 2026-11-12).
- AR19: Disable or protect legacy `/preview/[template]` and `/api/email/[template]` before external exposure.

### UX Design Requirements

Not applicable — no UX design contract exists for this scope. Authentication UI requirements (FR24, FR25, NFR12, NFR13) are carried within the reserved authentication epic.

### FR Coverage Map

Current phase keeps filesystem template storage and local image uploads (no database, no object storage). PostgreSQL, object storage, and authentication are deferred to later phases but documented so no requirement is lost.

FR20: Epic 1 — Consistent JSON error envelope (AR9).
FR21: Epic 1 (no sensitive disclosure, AR9) + Epic F3 (auth-specific).
FR23: Epic 1 — Input validation ordering preserved (AR8).
FR36: Epic 1/existing — Export ZIPs remain self-contained (preserved; local bundling).
FR34, FR35: Epic 3 (current, partial via local uploads + bundling) → Epic F2 (full policy with object storage).
FR29: Epic F1 — nullable actor columns in PostgreSQL; Epic F3 populates them.
FR1–FR19, FR22, FR24–FR28, FR30–FR33: Epic F3 — Authentication & authorization (deferred).
NFR9: Epic 3 (fail-closed access-gate posture) → Epic F3 (completes enforcement).
NFR2: Epic 3 — server-only secrets verification (continuous via AR11).
NFR14, NFR15: Epic 1 (correlation-id structured logging) + Epic F3 (auth events).
NFR1–NFR8, NFR10–NFR13, NFR16: Epic F3 — Auth security/performance/reliability/accessibility/privacy.
AR1, AR8, AR9, AR16: Epic 1 — Boundary discipline, validation, error envelope, typed config.
AR2, AR3: Epic 1 — Ports + composition root; **only filesystem + local-asset adapters bound this phase**. `JobQueue`, `TemplateRepository` (postgres), and `AssetStore` (s3) interfaces are defined but their non-local adapters are deferred.
AR5, AR6: Epic 1 — Ratify registry-as-source-of-truth and server-only render invariants.
AR10: Epic 2 (open-mode gate + correlation) → Epic F4 (enforced).
AR11: All epics — server-only secrets (enforced continuously; verified in Epic 2).
AR17: Epic 2 — Test/lint/format baseline.
AR18: Epic 2 — Next.js and PostgreSQL maintenance upgrade track.
AR19: Epic 2 — Legacy route lockdown before external exposure.
AR4, AR12, AR13: Epic F1 — Schema-as-source-of-truth, PostgreSQL schema, optimistic concurrency, JSON→DB import (deferred).
AR14: Epic F2 — S3 asset adapter, upload hardening, delivery policy (deferred).
AR7, AR15: Epic F3 — JobQueue worker runtime, async export/import, job status contract (deferred).

## Epic List

### Current Phase

### Epic 1: Consistent API & Storage Foundation
Introduce ports-and-adapters, a composition root, typed config, and a template service so every request flows through swappable interfaces with uniform Zod validation, a single error envelope, and correlation-id logging. This phase binds **only the filesystem template adapter and local-asset adapter** — no database, no object storage, no worker runtime — so a local developer sees no behavior change while the seams for future shared storage and async work are put in place (interfaces defined, non-local adapters deferred). Delivers immediately usable value: predictable, safe API responses and the abstraction every later epic builds on.
**FRs/ARs covered:** FR20, FR21 (partial), FR23, FR36 (preserved), NFR14, NFR15 (partial), AR1, AR2, AR3 (filesystem/local only), AR5, AR6, AR8, AR9, AR16.

### Epic 2: Internal Hardening & External-Exposure Gate
Lock down legacy demo routes, enforce request hardening, add the access gate in `AUTH_MODE=open` with fail-closed posture wiring, verify server-only secrets, establish a test/lint/format baseline, and add the dependency-upgrade track. Delivers value: the tool is safe for internal developer-team use and is explicitly blocked from external exposure until authentication exists.
**FRs/ARs covered:** NFR9 (posture), NFR2 (verification), AR10 (open mode), AR11 (verification), AR17, AR18, AR19.

### Deferred (Future Phases)

### Epic F1: Shared Multi-User Template Storage (PostgreSQL) — deferred
Add a PostgreSQL `TemplateRepository` behind the Epic 1 port, with `document` jsonb as source of truth, projection columns, a `revision` column for optimistic concurrency (stale write → 409), and a one-time JSON→DB import. Enables multiple developers to share one concurrent-safe template library. Scheduled when shared deployment is needed.
**FRs/ARs covered:** FR29 (schema support), AR4, AR12, AR13.

### Epic F2: Shared Asset Storage & Delivery (Object Storage) — deferred
Add an S3-compatible `AssetStore` behind the Epic 1 port, with upload hardening (content-type allowlist, size limits, UUID keys) and a defined asset-delivery policy that keeps hosted images loadable by email recipients. Scheduled with shared deployment.
**FRs/ARs covered:** FR34, FR35, AR14.

### Epic F3: Responsive Long-Running Operations (Background Worker) — deferred
Wire the `JobQueue` port to a durable-queue adapter and a worker runtime, add a `GET /api/jobs/[id]` status contract, and move export and Figma/AI import to async jobs while keeping preview synchronous. Deferred: marginal benefit for single-user local instances; valuable under shared load.
**FRs/ARs covered:** AR7, AR15.

### Epic F4: Authentication & Authorization — deferred (External-Release Enabler)
Implement the reserved AD-10 seam: organization identity sign-in, secure sessions, Member/Administrator roles enforced server-side, auth event logging, upload authentication, and client session-expiry handling — then flip `AUTH_MODE=enforced`. Unlocks external deployment. Explicitly deferred per current direction.
**FRs/ARs covered:** FR1–FR19, FR21 (auth-specific), FR22, FR24–FR33, NFR1–NFR8, NFR10–NFR13, NFR16, AR10 (enforced).

## Epic 1: Consistent API & Storage Foundation

Establish the ports-and-adapters seam, a single composition root, typed config, a template service, a uniform error envelope, and correlation-id logging — binding only the filesystem and local-asset adapters so a local developer sees no behavior change while the abstraction for every later epic is put in place.

### Story 1.1: Typed, validated configuration module

As a developer running the tool,
I want environment configuration read and validated once at startup,
So that misconfiguration fails fast with a clear message instead of surfacing as a runtime error later.

**Acceptance Criteria:**

**Given** the application starts
**When** `config.ts` loads environment values
**Then** it validates them against a schema and exposes a typed, read-only config object
**And** an invalid or missing required value stops startup with a descriptive, non-sensitive error.

**Given** `STORAGE_DRIVER` and `ASSET_DRIVER` are unset
**When** config resolves
**Then** they default to `filesystem` and `local` respectively.

### Story 1.2: Define persistence and infrastructure port interfaces

As a developer,
I want `TemplateRepository`, `AssetStore`, `EventLog`, and `JobQueue` defined as interfaces,
So that domain and application code depend on contracts rather than concrete infrastructure.

**Acceptance Criteria:**

**Given** the ports layer at `src/lib/ports/`
**When** the interfaces are defined
**Then** each declares its operations in terms of domain types only, with no import of `fs`, database, SDK, or queue implementations.

**Given** a future adapter (postgres, s3, durable queue)
**When** it is added later
**Then** it can implement the existing interface without changing any consumer.

### Story 1.3: Filesystem template repository adapter

As a developer,
I want the existing template file storage refactored to implement `TemplateRepository`,
So that all template persistence flows through the port with identical behavior.

**Acceptance Criteria:**

**Given** the current `fileStorage.ts` logic
**When** it is moved behind a `FilesystemTemplateRepository` adapter
**Then** list, get, create, update, delete, and duplicate behave exactly as before against `data/templates/*.json`.

**Given** a stored document
**When** it is read or written
**Then** it is validated against `emailTemplateDocumentSchema` (invalid files skipped on list, as today).

### Story 1.4: Local asset store adapter

As a developer,
I want uploaded images served through a `LocalAssetStore` adapter,
So that asset handling flows through the port and can later be swapped for object storage.

**Acceptance Criteria:**

**Given** the current upload directory behavior
**When** an image is uploaded through `AssetStore`
**Then** it is written to the local uploads location and returns the same URL shape used today.

**Given** the adapter
**When** infrastructure code accesses the filesystem for assets
**Then** it does so only inside the adapter, not in routes or services.

### Story 1.5: Composition root binding local adapters

As a developer,
I want a single composition root that binds one adapter per port from config,
So that deployment mode is chosen in exactly one place rather than scattered across the code.

**Acceptance Criteria:**

**Given** `container.ts`
**When** the app resolves dependencies
**Then** it binds `FilesystemTemplateRepository` and `LocalAssetStore` when drivers are `filesystem`/`local`.

**Given** an unimplemented driver value (e.g. `postgres`, `s3`)
**When** the container resolves it this phase
**Then** it fails fast with a clear "adapter not available in this phase" message rather than silently degrading.

### Story 1.6: Template service over the repository port

As a developer,
I want route handlers to call a `TemplateService` instead of storage directly,
So that business rules and timestamps live in one place and handlers stay thin.

**Acceptance Criteria:**

**Given** the template API routes
**When** they handle a request
**Then** they call `TemplateService`, which uses the injected `TemplateRepository`, and contain no direct storage access.

**Given** a create or update
**When** the service persists it
**Then** `createdAt`/`updatedAt` are stamped consistently and the document is schema-valid.

### Story 1.7: Uniform API error envelope

As a client of the API,
I want every error to use one consistent JSON shape,
So that the builder can handle failures predictably and no internal detail leaks.

**Acceptance Criteria:**

**Given** any API route failure
**When** the response is returned
**Then** the body is `{ error: { code, message } }` with an appropriate status (400/404/409/500).

**Given** an unexpected server error
**When** it is returned
**Then** the message is safe for display and contains no stack trace, provider name, secret, or env value. (FR20, FR21)

**Given** a Zod validation failure on input
**When** the route processes it
**Then** it returns 400 before any side effect. (FR23, AR8)

### Story 1.8: Correlation-id and structured request logging

As an operator,
I want each request tagged with a correlation id and logged in a structured form,
So that a client-visible failure can be traced to server detail without exposing it.

**Acceptance Criteria:**

**Given** an incoming request
**When** it is processed
**Then** a correlation id is attached and included in structured server logs.

**Given** an error response
**When** it is returned to the browser
**Then** it can be correlated to the server log entry without the response carrying sensitive detail. (NFR14, NFR15 partial)

### Story 1.9: Boundary-discipline verification for infrastructure access

As a developer,
I want a check that infrastructure access stays inside adapters and rendering stays server-side,
So that the ports abstraction is not bypassed as the codebase grows.

**Acceptance Criteria:**

**Given** the source tree
**When** the boundary check runs
**Then** it flags any direct `fs`/SDK use outside `src/lib/adapters/**` and any email HTML rendering outside the server renderer. (AR2, AR5, AR6)

**Given** the current code
**When** the check runs
**Then** existing violations are either resolved or explicitly recorded as known exceptions.

## Epic 2: Internal Hardening & External-Exposure Gate

Make the tool safe for internal developer-team use and structurally unable to be exposed externally until authentication exists: quality tooling, enforced boundaries, legacy route lockdown, request hardening, secret verification, and an explicit exposure gate.

### Story 2.1: Test, lint, and format baseline

As a developer,
I want working lint, format, and a minimal test runner,
So that quality checks exist for all subsequent work.

**Acceptance Criteria:**

**Given** the repository has no effective ESLint/Prettier/test config today
**When** the baseline is added
**Then** `lint` runs against a real config, formatting is defined, and a test runner executes at least one smoke test. (AR17)

**Given** CI or a local run
**When** checks execute
**Then** they pass on the current codebase (after any minimal fixes).

### Story 2.2: Enforced import-boundary rule

As a developer,
I want the boundary discipline from Story 1.9 enforced as a lint rule,
So that violations fail the check automatically rather than relying on review.

**Acceptance Criteria:**

**Given** the lint baseline from Story 2.1
**When** the boundary rule is configured
**Then** importing `fs`/infrastructure SDKs outside `src/lib/adapters/**` fails linting. (AR2)

**Given** a compliant change
**When** lint runs
**Then** it passes without boundary errors.

### Story 2.3: Pass-through access gate in open mode

As an operator,
I want a single server-side access gate present but in `AUTH_MODE=open`,
So that the enforcement seam exists now and authentication can later be enabled without route rewrites.

**Acceptance Criteria:**

**Given** `AUTH_MODE=open`
**When** any request passes through the middleware
**Then** it is allowed, stamped with an anonymous actor, and carries the correlation id. (AR10 open)

**Given** protected matchers cover `/builder/**` and `/api/**` except public endpoints
**When** the gate is added
**Then** enabling enforcement later requires only wiring an identity adapter and changing the mode flag.

### Story 2.4: Legacy demo route lockdown

As an operator,
I want legacy demo routes disabled by default outside local mode,
So that old static preview paths cannot bypass current access assumptions.

**Acceptance Criteria:**

**Given** `/preview/[template]` and `/api/email/[template]`
**When** the app runs outside local mode
**Then** these routes are disabled or protected by default. (AR19)

**Given** local development
**When** a developer opts in
**Then** the demo routes remain available.

### Story 2.5: Request hardening

As an operator,
I want request-size limits, upload validation, and basic rate limiting on expensive routes,
So that the tool resists abuse and accidental overload.

**Acceptance Criteria:**

**Given** an upload
**When** it is received
**Then** it is checked against a content-type allowlist and size limit and rejected with the standard error envelope if invalid.

**Given** expensive routes (render, export, Figma/AI)
**When** they receive excessive requests
**Then** basic rate limiting applies and oversized bodies are rejected.

### Story 2.6: Server-only secret verification

As a security reviewer,
I want confirmation that no secret reaches the client or responses,
So that credentials for Figma/AI/Resend and infrastructure stay server-side.

**Acceptance Criteria:**

**Given** a production build
**When** the client bundle and API responses are inspected
**Then** no Figma/AI/Resend/infrastructure credential or session token appears. (AR11, NFR2)

**Given** a check for this
**When** it runs
**Then** it can be repeated as part of the baseline in Story 2.1.

### Story 2.7: External-exposure gate

As an operator,
I want the app to refuse a non-local network bind unless authentication is enforced,
So that it cannot be exposed externally before Epic F4 is delivered.

**Acceptance Criteria:**

**Given** a non-local bind configuration with `AUTH_MODE=open`
**When** the app starts
**Then** it refuses to serve protected routes externally and states the reason (fail closed). (NFR9, AR10)

**Given** local/loopback or VPN-only operation
**When** the app starts in `AUTH_MODE=open`
**Then** it runs normally for the internal team.

### Story 2.8: Dependency-upgrade maintenance track

As a maintainer,
I want a documented upgrade track for framework and datastore versions,
So that security fixes and EOL deadlines are handled deliberately.

**Acceptance Criteria:**

**Given** the current Next.js 14 pin and future PostgreSQL use
**When** the maintenance track is documented
**Then** it records the Next.js 14→16 upgrade path (security fixes) and the PostgreSQL version policy (avoid 14, EOL 2026-11-12). (AR18)

**Given** a scheduled maintenance window
**When** an upgrade is performed
**Then** the baseline checks from Story 2.1 gate the change.

## Deferred Epic Stories

Detailed stories for Epics F1–F4 are intentionally not expanded now; each will be broken down when its phase is scheduled. The Epic 1 ports (`TemplateRepository`, `AssetStore`, `JobQueue`) and the reserved AD-10 access gate mean these can be added later as adapters and an identity module without reworking current-phase routes or services.

- **Epic F1 (PostgreSQL):** stories for schema/migrations, Postgres repository adapter, optimistic-concurrency 409 handling, and JSON→DB import.
- **Epic F2 (Object storage):** stories for the S3 asset adapter, upload hardening at scale, and the asset-delivery policy.
- **Epic F3 (Background worker):** stories for the durable queue adapter, worker runtime, job-status endpoint, and async export/import.
- **Epic F4 (Authentication):** stories for identity sign-in, sessions, roles, auth event logging, upload authentication, client session-expiry handling, and flipping `AUTH_MODE=enforced`.
