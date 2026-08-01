---
title: User Authentication for EDM React Email Tool
status: draft
created: 2026-07-28
updated: 2026-07-28
---

# Product Requirements Document: User Authentication

## Product Context

The EDM React Email Tool is an internal, browser-based visual email builder. It currently exposes the builder, saved templates, rendering, export, test-send, asset upload, Figma import, and AI-assisted conversion without user authentication or authorization. Templates are stored as shared JSON files, and server APIs can access external services through environment credentials.

This PRD defines the first authentication and access-control release for an internal team deployment.

## Problem Statement

Anyone who can reach the application can currently view and modify templates, upload assets, render or export emails, invoke AI and Figma integrations, and attempt test sends. The application cannot identify who performed an action, restrict sensitive capabilities, terminate a user's access, or prevent unauthenticated use of server APIs.

This makes the product unsuitable for deployment on a shared network or internet-accessible environment. It also creates operational and security risk around email content, uploaded assets, API consumption, and service credentials.

## Goals

1. Require an authenticated organizational identity before a person can access the application or its protected APIs.
2. Provide a simple sign-in, sign-out, and session lifecycle suitable for an internal team tool.
3. Restrict access to approved users and distinguish normal members from administrators.
4. Enforce access controls on the server rather than relying on hidden UI controls.
5. Record sufficient user identity metadata for operational accountability.
6. Preserve existing builder, preview, export, Figma, AI, upload, and test-send workflows for authorized users.
7. Provide predictable handling for expired, revoked, unauthorized, and insufficiently privileged sessions.

## Non-Goals

1. Public self-service registration or consumer account creation.
2. Social profiles, user bios, avatars, or other community features.
3. Billing, subscriptions, quotas by plan, or paid account management.
4. Per-template ownership, private folders, or fine-grained template sharing in the initial release.
5. A custom password storage or password-recovery system when an organization-approved identity provider is available.
6. Redesigning the builder or email-component architecture.
7. Replacing JSON template storage with a database solely to deliver authentication.
8. Recipient authentication for exported or sent emails.
9. Comprehensive enterprise audit, SIEM, or compliance certification.

## Users and Roles

### Member

An approved internal user who can access the builder and use its standard template, preview, import, export, and test-send capabilities.

### Administrator

An approved internal user who has all Member capabilities and can manage application access, inspect authentication-related events, and revoke active access where supported.

## User Stories

### Authentication

- As an approved team member, I want to sign in with my organizational identity so that I can securely access the email builder.
- As a signed-in user, I want my session to persist across normal page navigation and refreshes so that authentication does not interrupt my work.
- As a signed-in user, I want to sign out so that another person cannot reuse my session.
- As a user whose session has expired, I want to be redirected to sign in and returned to my intended page afterward.
- As an unapproved user, I want a clear access-denied message so that I know whom to contact.

### Authorization and administration

- As an administrator, I want only approved identities to enter the application.
- As an administrator, I want to revoke a user's access so that departures and role changes take effect promptly.
- As an administrator, I want privileged actions to remain unavailable to Members.
- As an administrator, I want authentication and access-denial events associated with a user identity for troubleshooting and accountability.

### Protected product workflows

- As a Member, I want existing template editing, preview, save, export, import, and test-send workflows to continue after authentication is introduced.
- As a Member, I want unsaved work to be protected when my session is close to expiring.
- As a developer or operator, I want unauthenticated API requests rejected consistently without exposing internal details.

## Functional Requirements

### Authentication and access

- **FR-1.1:** The system shall require authentication for all application pages except the sign-in flow, authentication callback, access-denied page, and operational health endpoints explicitly designated as public.
- **FR-1.2:** The system shall require authentication for template, registry, render, export, send, upload, Figma, and AI API routes.
- **FR-1.3:** Authentication shall use an organization-approved identity source.
- **FR-1.4:** Only identities that satisfy the configured organization or allowlist policy shall receive application access.
- **FR-1.5:** The system shall not provide public self-registration.
- **FR-1.6:** A successful sign-in shall establish a secure application session and return the user to the originally requested valid application route.
- **FR-1.7:** A failed or disallowed sign-in shall not create an application session and shall display an actionable, non-sensitive error.

### Session lifecycle

- **FR-2.1:** A session shall remain valid across page navigation and browser refreshes until it expires, is revoked, or the user signs out.
- **FR-2.2:** Signing out shall invalidate the application session and redirect the user to the sign-in page.
- **FR-2.3:** Expired or invalid sessions shall be rejected by both page and API access controls.
- **FR-2.4:** The application shall preserve a safe return destination through the sign-in flow and reject external or malformed redirect destinations.
- **FR-2.5:** The application shall warn an active editor before foreseeable session expiry when an unsaved template is present, where the identity system exposes sufficient expiry information.

### Authorization

- **FR-3.1:** Every authenticated user shall be assigned either the Member or Administrator role.
- **FR-3.2:** Authorization shall be enforced server-side for every privileged operation.
- **FR-3.3:** Administrator-only controls shall not be displayed to Members.
- **FR-3.4:** An authenticated request without sufficient privileges shall receive an access-denied response and shall not perform the requested operation.
- **FR-3.5:** Revoked or disabled users shall lose access no later than the next session validation or the configured maximum revocation interval.

### API behavior

- **FR-4.1:** Protected API routes shall return HTTP 401 when no valid authenticated session is present.
- **FR-4.2:** Protected API routes shall return HTTP 403 when the user is authenticated but lacks permission.
- **FR-4.3:** Authentication errors shall use a consistent JSON response shape suitable for the existing client fetch layer.
- **FR-4.4:** API responses shall not disclose tokens, provider details, stack traces, environment values, or whether an unrelated identity exists.
- **FR-4.5:** Browser-initiated state-changing requests shall be protected against cross-site request forgery.
- **FR-4.6:** Existing API request validation shall continue to run after authentication and authorization checks.

### User experience

- **FR-5.1:** The application shall provide sign-in, sign-out, access-denied, and session-expired experiences.
- **FR-5.2:** The authenticated shell shall display enough identity information for users to confirm which account is active.
- **FR-5.3:** Authentication failures shall not discard an already loaded template or silently report a save as successful.
- **FR-5.4:** When an API request fails because a session expired, the client shall stop protected follow-up actions and prompt the user to reauthenticate.
- **FR-5.5:** Authentication shall not change the content or rendering of exported emails.

### Accountability

- **FR-6.1:** Newly created and updated templates shall record the acting authenticated user where the storage model supports metadata without breaking existing documents.
- **FR-6.2:** The system shall record successful sign-ins, sign-outs, access denials, and administrator access changes with timestamp and user identity.
- **FR-6.3:** Authentication event records shall exclude credentials, session tokens, and email-template content.
- **FR-6.4:** Operators shall be able to correlate a failed protected request with an authentication event without exposing sensitive details to the browser.

### Assets and email delivery

- **FR-7.1:** Asset upload and asset-management operations shall require authentication.
- **FR-7.2:** The product shall explicitly define whether uploaded asset URLs are public, authenticated, or bundled before deployment.
- **FR-7.3:** If a sent email references hosted assets, authentication shall not prevent intended email recipients from loading those assets.
- **FR-7.4:** Exported ZIPs shall remain self-contained according to the existing export behavior.

## Non-Functional Requirements

### Security

- **NFR-1:** Sessions shall use secure, HTTP-only, same-site cookies in production.
- **NFR-2:** Authentication secrets and credentials shall remain server-side and shall not be included in client bundles, logs, or API responses.
- **NFR-3:** Production traffic shall use HTTPS.
- **NFR-4:** The system shall protect sign-in and callback endpoints against common replay, redirect, fixation, and cross-site request attacks.
- **NFR-5:** Authentication dependencies shall be maintained at supported versions and reviewed for known critical vulnerabilities before release.
- **NFR-6:** Identity-provider multi-factor authentication shall be supported and may be enforced by organizational policy.

### Performance

- **NFR-7:** Authentication checks shall add no more than 200 ms at the 95th percentile to normal same-region API requests, excluding interactive sign-in.
- **NFR-8:** Session validation shall not introduce a separate remote identity-provider request for every builder interaction when a secure local validation mechanism is available.

### Reliability

- **NFR-9:** Authentication failures shall fail closed: protected content and actions must remain unavailable when session validity cannot be established.
- **NFR-10:** Identity-provider outages shall not corrupt templates or report failed saves as successful.
- **NFR-11:** Users shall receive a clear recoverable state when authentication services are unavailable.

### Accessibility and usability

- **NFR-12:** Authentication screens and controls shall support keyboard navigation, visible focus, accessible labels, and WCAG 2.1 AA contrast.
- **NFR-13:** Error messages shall be understandable without exposing security-sensitive detail.

### Operability and privacy

- **NFR-14:** Authentication events shall be structured and timestamped.
- **NFR-15:** Operational logs shall use the minimum personal information needed for access control and troubleshooting.
- **NFR-16:** Retention and deletion periods for authentication events shall be configurable according to organizational policy.

## Acceptance Criteria

1. Given an unauthenticated visitor requests `/builder`, they are redirected to sign in and cannot view template data.
2. Given an unauthenticated client calls any protected API, it receives HTTP 401 and no protected operation occurs.
3. Given an approved Member completes sign-in, they return to the requested internal page and can use existing builder workflows.
4. Given an identity does not meet the organization or allowlist policy, sign-in is denied without creating a session.
5. Given a valid session, refreshing the builder does not require another interactive sign-in.
6. Given a user signs out, subsequent page and API requests require authentication.
7. Given a session expires during editing, the next protected request is not reported as successful and the user is prompted to reauthenticate.
8. Given an authenticated Member requests an Administrator-only operation, the server returns HTTP 403 and makes no state change.
9. Given an Administrator performs an allowed privileged operation, the action succeeds and records the acting identity and timestamp.
10. Given a user's access is revoked, the user cannot establish a new session and existing access ends within the configured revocation interval.
11. Given an authenticated Member creates, edits, previews, saves, exports, imports, or test-sends a template, the workflow behaves as before except for attributable identity and access checks.
12. Given a malicious external return URL is supplied during sign-in, the application ignores or replaces it with a safe internal destination.
13. Given a protected state-changing request lacks required cross-site request protection, it is rejected without mutation.
14. Given a sent or exported email uses images, the chosen asset policy allows intended recipients to load those images without application authentication.
15. Security review confirms that session tokens, identity-provider credentials, and service credentials do not appear in browser code, application responses, or ordinary logs.

## Risks

1. **Public asset conflict:** Protecting all uploaded files could break images in delivered emails; leaving them public may expose sensitive source assets.
2. **Shared filesystem model:** Templates are globally shared, so authentication alone does not provide user-level isolation or conflict management.
3. **Incomplete API coverage:** Missing a single server route could leave rendering, uploads, AI usage, or test sending exposed.
4. **Session expiry during editing:** Authentication interruptions could cause lost work or confusing save failures.
5. **Identity-provider dependency:** Provider outages or configuration errors could block the entire internal team.
6. **Role expansion:** Member and Administrator roles may prove too coarse once send permissions, template ownership, or approval workflows are introduced.
7. **Legacy preview paths:** The static preview and React Email development paths may bypass the primary builder's access assumptions.
8. **Local-development friction:** Strict authentication may impede local React Email previews, scripts, seeding, and export workflows unless non-production behavior is deliberately defined.
9. **Accountability gaps:** File-backed persistence and current template schemas may limit reliable audit history without a later storage change.
10. **Scope creep:** Authentication can expand into user management, SSO administration, granular authorization, and compliance work beyond this release.

## Assumptions

1. **[ASSUMPTION]** The initial deployment is an internal team tool, not a public multi-tenant service.
2. **[ASSUMPTION]** The organization has or will select an approved identity source; the exact vendor and protocol are architecture decisions.
3. **[ASSUMPTION]** The identity source can provide a stable user identifier, display name, email address, and organization membership signal.
4. **[ASSUMPTION]** The initial release uses a shared template workspace with Member and Administrator roles.
5. **[ASSUMPTION]** Per-template ownership and sharing are deferred until product demand justifies a more granular authorization model.
6. **[ASSUMPTION]** Existing JSON templates must remain readable after authentication is introduced.
7. **[ASSUMPTION]** Figma, Gemini/Ollama, and Resend credentials remain application-level secrets rather than user-provided credentials.
8. **[ASSUMPTION]** Internal operators can provision or approve the first Administrator outside the application during deployment.
9. **[ASSUMPTION]** Hosted image requirements will be decided before production rollout because sent email recipients cannot authenticate to the builder.

## Open Product Decisions

1. Which organizational identity provider and sign-in protocol will be used?
2. Is access based on organization membership, a user allowlist, identity-provider groups, or a combination?
3. Which actions, if any, should be Administrator-only beyond access management?
4. What maximum session lifetime and revocation interval are acceptable?
5. Should test sending be available to all Members or restricted to a separate permission?
6. Should uploaded assets be public, protected, copied to a delivery CDN, or always bundled?
7. What retention period applies to authentication and access-denial events?

