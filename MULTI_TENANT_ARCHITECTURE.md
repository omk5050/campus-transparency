# ETHOS — Multi-Tenant & Multi-Organization Architecture (Phase 2.3 Foundation)

## 1. Overview: What is an Organization in ETHOS?

In the ETHOS Ethical Governance Platform, an **Organization** represents an autonomous institutional tenant. Organizations can be:
- **COLLEGE**
- **UNIVERSITY**
- **NGO**
- **SCHOOL**
- **CORPORATE**
- **OTHER**

Each organization manages its own internal complaints, investigators, departments, workflows, and audit histories in complete data isolation from other organizations.

---

## 2. Domain & Data Relationship Models

### A. Users → Organizations
- Every normal user (`STUDENT`, `ADMIN`/investigator) belongs to **EXACTLY ONE** organization via `users.organization_id -> organizations.id`.
- There is no many-to-many relationship between normal users and organizations.
- The `users.organization_id` column is foreign-keyed to `organizations.id` with `ON DELETE RESTRICT`.
- The column is technically nullable at the database constraint level to support future platform-wide Super Admins who operate cross-organization without belonging to any single tenant. Normal student/admin operations require a valid, non-null organization context.

### B. Issues → Organizations
- Every complaint/issue belongs directly to an organization via `issues.organization_id -> organizations.id` with `NOT NULL` constraint and `ON DELETE RESTRICT`.
- Issues do not rely solely on `issue -> reporter -> organization` because future anonymous submissions may preserve anonymity without creating a direct user foreign-key link.
- New issues created by authenticated users automatically inherit the authenticated user's organization server-side.

### C. Audit Logs → Organizations
- Every audit record in `audit_logs` references `issue_id -> issues.id`.
- Tenant ownership of audit logs is derived directly from the underlying `issue.organization_id`. This prevents data duplication while strictly scoping admin audit queries to the administrator's organization via relational joins.

---

## 3. Core Tenant Security & Context Derivation

### Server-Side Derivation: Zero Trust for Client-Supplied Organization IDs
Clients are **NEVER** trusted to supply `organizationId` for authorization or scoping:
- `organizationId` sent in request bodies (e.g., during issue creation) is ignored.
- `organizationId` in query parameters or URL paths is never used to grant cross-tenant access.
- `localStorage` or arbitrary HTTP headers are never trusted as proof of organization membership.

### Data Access Architecture Pipeline:
```
Authenticated User (JWT / SecurityContext)
                 ↓
CurrentUserService (resolves authenticated username & database user)
                 ↓
Organization Context (user.getOrganization().getId())
                 ↓
Service-Layer Authorization & Scoping
                 ↓
Repository Queries & Specifications (IssueSpecification.belongsToOrganization)
```

1. **Authentication:** The JWT contains the username subject; the database identity is loaded into `SecurityContext`.
2. **CurrentUserService:** Retrieves the verified `User` and `Organization` from the authenticated security context.
3. **Command Enforcement:** Commands (`create`, `report`, `startProgress`, `resolve`, `reject`, `hide`, `assign`, `unassign`, `vote`) strictly verify that the target issue belongs to the caller's organization.
4. **Information Leakage Prevention:** Any attempt by User A (Organization A) to read or mutate Issue B (Organization B) returns **`404 NOT_FOUND`** instead of `403 FORBIDDEN` to prevent resource enumeration and existence discovery.
5. **Assignment Boundary Enforcement:**
   - Administrators can only assign issues belonging to their organization.
   - Administrators can only assign investigator users who belong to the same organization as the issue.
   - Assignee lookups (`GET /api/issues/assignees`) return only administrative staff belonging to the caller's organization.

---

## 4. Public Tracking vs. Authenticated Tenant Queries

Tracking codes (`CMP-XXXXXXXX`) serve as public capabilities/credentials for complainants:
- **Public Tracking (`GET /api/issues/track/{trackingCode}`):**
  - Unauthenticated access permitted via the tracking code.
  - Returns only complainant-facing fields: `id`, `title`, `description`, `status`, `voteCount`, `reporterAlias`, `trackingCode`, `category`, `department`, `createdAt`, `updatedAt`.
  - **Does NOT expose:** internal investigator identities (`assignedTo` is always masked to `null`), moderation hidden states (`hidden` is always masked to `false`), internal notes, or private audit trails.
- **Tenant Queries (`GET /api/issues`, `GET /api/issues/admin`, `GET /api/issues/{id}`):**
  - Authenticated and strictly scoped to the caller's organization.

---

## 5. Existing Data Migration (V5 Flyway Migration)

The additive migration `V5__add_multi_organization_foundation.sql` was safely applied to the existing database without data loss:
1. Created `organizations` table.
2. Inserted a default active tenant: `'ETHOS University Campus'` (`UNIVERSITY`, `ACTIVE`, `admin@ethos-campus.edu`).
3. Backfilled all pre-existing users to `'ETHOS University Campus'`.
4. Enforced foreign key `fk_users_organization`.
5. Backfilled all pre-existing issues to `'ETHOS University Campus'`.
6. Enforced `NOT NULL` constraint and foreign key `fk_issues_organization` on `issues`.
7. Created performance and isolation indexes:
   - `idx_organizations_status ON organizations(status)`
   - `idx_users_organization_id ON users(organization_id)`
   - `idx_issues_organization_id ON issues(organization_id)`
   - `idx_issues_org_status ON issues(organization_id, status)`
   - `idx_issues_org_tracking ON issues(organization_id, tracking_code)`
   - `idx_audit_logs_issue_id ON audit_logs(issue_id)`

---

## 6. Public Transparency Design Requirements (Future Phases)

- Individual complaints will **NEVER** become publicly visible across organizations.
- Future public transparency and leaderboard systems will compute and expose **ONLY aggregate metrics** (e.g., total complaints, resolution rates, average resolution time) grouped cleanly by `organization_id`.
- The explicit `issues.organization_id` foreign key ensures future analytics engines calculate organization statistics without cross-tenant data leakage.

---

## 7. Future Phases Dependent on This Multi-Tenant Foundation

The multi-tenant foundation leaves clean extension points for subsequent phases:
- **Phase 2.5+:**
  - Organization join codes for student/staff onboarding.
  - Anonymous identity redesign (complaint-specific privacy-preserving identifiers).
  - Internal Notes & Investigator Messaging (strictly scoped by `organization_id`).
  - Secure File Attachments.
  - Multi-tenant Notifications.
  - Public Aggregate Transparency Statistics & Leaderboards.
  - Official ETHOS Platform Forum & Announcement Channels.

---

## 8. Phase 2.4 — Organization Registration & Super Admin Approval

### A. Lifecycle Architecture & Controlled Onboarding
To maintain institutional integrity, organizations are onboarded through a multi-stage approval pipeline:

```
Public Applicant
      ↓
POST /api/organization-applications
      ↓
Status: PENDING (organization_applications table)
      ↓
SUPER_ADMIN Review (GET /api/admin/organization-applications)
   ├── APPROVE (POST /api/admin/organization-applications/{id}/approve)
   │     ↓
   │   Atomic Transaction:
   │   - Create Organization (status: ACTIVE)
   │   - Create Org Admin User (role: ADMIN, org_id: new_org.id)
   │   - Update Application (status: APPROVED, reviewed_by, reviewed_at, approved_organization_id)
   │   - Record Audit Log (action: APPROVED)
   │
   └── REJECT (POST /api/admin/organization-applications/{id}/reject)
         ↓
       - Update Application (status: REJECTED, rejection_reason, reviewed_by, reviewed_at)
       - Record Audit Log (action: REJECTED)
       - NO organization or user account is created
```

> **CRITICAL RULE:** Organization applications **DO NOT automatically activate an organization or create usable users**. The application record is purely an onboarding request until explicitly approved by a platform `SUPER_ADMIN`.

### B. Role-to-Organization Relationship
The platform enforces strict role-to-organization boundaries:
- **`SUPER_ADMIN`:**
  - Platform-wide governance authority.
  - `organization_id = NULL`.
  - Authorized to list, inspect, approve, and reject organization applications.
  - Does NOT belong to any single organization tenant.
  - Bootstrapped securely via environment configuration; can never be registered through public registration endpoints.
- **`ORG_ADMIN` (`ADMIN`):**
  - Institutional administrative authority.
  - `organization_id = organization X` (`NOT NULL`).
  - Manages only their designated organization's complaints, investigators, and workflows.
  - Prohibited from accessing or reviewing organization applications (enforced with `403 FORBIDDEN`).
- **`STUDENT` / Investigator:**
  - `organization_id = organization X` (`NOT NULL`).
  - Strictly tenant-scoped. Prohibited from administrative review endpoints.

### C. Password Security
- Passwords for the requested organization administrator are validated against the platform's password policy (minimum 8 characters, requiring at least one letter, one digit, and one special character).
- Immediately upon submission, passwords are hashed using `BCryptPasswordEncoder`.
- Passwords are **never stored in plaintext**.
- Passwords and password hashes are **never returned in API responses** (omitted in `OrganizationApplicationResponse`) and are excluded from audit log records.

### D. Transactional Approval
- Approval is strictly atomic (`@Transactional`).
- If organization creation, admin account creation, or application state updates fail, the entire transaction rolls back.
- No orphan users or inactive partial organizations are left behind.
- Idempotency / state machine protections: Applications in `APPROVED` or `REJECTED` states cannot be approved or rejected again (`IllegalStateException` / `400 BAD_REQUEST`).

### E. Mandatory Rejection Reason
- Rejection requires a non-blank reason (`RejectOrganizationApplicationRequest.reason`).
- The reason is permanently stored in `rejection_reason` and recorded in the audit log.
- Rejected applicants cannot log in, as no user account is ever created.

### F. Organization Inactivity / Suspension Enforcement
- Spring Security's `CustomUserDetailsService` verifies organization status during authentication:
  - Users belonging to an organization with status other than `ACTIVE` (e.g. `SUSPENDED` or `PENDING`) are automatically denied login (`DisabledException` -> `401 UNAUTHORIZED`).
  - `SUPER_ADMIN` accounts (`organization_id = NULL`) bypass tenant suspension checks.

### G. Audit Logging
Administrative application decisions are permanently captured in `organization_application_audit_logs`:
- Application ID
- Action (`SUBMITTED`, `APPROVED`, `REJECTED`)
- Acting Super Admin username
- Timestamp
- Action metadata / details (excluding all credentials)

---

## 9. Phase 2.5 — Organization Join Codes for Student/Staff Onboarding

### A. Controlled Tenant Onboarding Model
In ETHOS multi-tenancy, users cannot self-assign to an arbitrary organization or elevate their own privileges. Institutional membership is securely controlled via **Organization Join Codes**:

```
Organization Administrator (or Super Admin)
       ↓
POST /api/admin/join-codes
  ├── targetRole: STUDENT | ADMIN
  ├── maxUses: optional limit (e.g. 50 uses)
  └── expiresInDays: optional TTL (e.g. 14 days)
       ↓
Cryptographically Secure Code (e.g., ALPHA-STU-7K82M)
       ↓
Complainant / Staff Applicant
  ├── Validate Code: GET /api/auth/join-codes/{code}/validate (public preview: org name & role)
  └── Register: POST /api/auth/register (username, password, joinCode)
       ↓
Atomic Transaction:
  - Validates code active, unrevoked, unexpired, and usage within maxUses
  - Confirms target organization is ACTIVE
  - Creates User with Role & Organization derived strictly from the Join Code
  - Increments joinCode.usedCount
  - Issues authenticated JWT session
```

### B. Security & Isolation Invariants
1. **Zero Client Privilege Selection:** The registration request does not accept an `organizationId` or `role`. These parameters are strictly derived server-side from the verified `OrganizationJoinCode`.
2. **Super Admin Guardrail:** Join codes can **NEVER** be generated for `Role.SUPER_ADMIN` (`400 BAD_REQUEST`). Platform Super Admins must be provisioned through secure platform configuration.
3. **Tenant Scoping on Code Administration:**
   - Institutional `ADMIN` users can only generate and list join codes for their own organization.
   - Any attempt by Admin A to revoke or view a join code belonging to Organization B fails with **`404 NOT_FOUND`**, preventing cross-tenant existence enumeration.
4. **Suspension Cascading:** If an organization is marked `SUSPENDED` or `PENDING`, join codes belonging to that organization are immediately rejected during validation and registration.
5. **Usage & Expiry Enforcement:**
   - Single-use and multi-use limits are enforced atomically. Once `usedCount >= maxUses`, the code becomes exhausted.
   - Codes past `expiresAt` or marked `revoked = true` are rejected.
6. **Public Preview without Data Leakage:** The `/api/auth/join-codes/{code}/validate` endpoint provides only the institutional display name, type, and target role so the user can verify their organization before registration, exposing no internal credentials or counts.

---

## 10. Phase 2.6 — Internal Notes & Investigator Messaging

### A. Private Case-Management Collaboration Architecture
To support thorough and ethical complaint investigations, ETHOS provides a strictly segregated collaboration layer attached to individual complaints:

1. **Internal Notes (`issue_internal_notes`):**
   - Formal case-management records (investigation findings, reminders, evidence analysis, resolution notes).
   - Author ownership: Each note records its author; only the author (or platform Super Admin) can edit note contents.
   - Deletion: Can be performed by the author or an institutional administrator of that organization.

2. **Investigator / Admin Messaging (`issue_messages`):**
   - Private communication channel between assigned investigators and institutional administrators working on the issue.
   - Chronological, issue-scoped message history.
   - Sender ownership: Only the sender can edit their message; deletion allowed by sender or organization admin.

### B. Strict Tenant Isolation & Access Control Rules
1. **Zero Public Exposure:** Internal notes and messages are **NEVER** included in:
   - Public issue feed (`GET /api/issues`)
   - Authenticated student issue detail (`GET /api/issues/{id}`)
   - Public tracking responses (`GET /api/issues/track/{trackingCode}`)
   - Public transparency statistics or future leaderboards.
2. **Tenant Scoping & Anti-Enumeration:**
   - Every note and message query explicitly requires the target issue to belong to the caller's organization.
   - Any attempt by User A (Organization A) to read, create, update, or delete a note or message on an issue belonging to Organization B returns **`404 NOT_FOUND`** (preventing resource existence enumeration).
3. **Role Enforcement:**
   - Normal student/member accounts cannot create or read internal notes or messages (`403 FORBIDDEN`).
   - Unauthenticated callers are rejected (`401/403`).
4. **Zero Client Trust:** Neither `organizationId` nor `authorId`/`senderId` are accepted in request payloads. Both are derived strictly from the authenticated security context.
5. **Audit Trail:**
   - All collaboration actions are permanently audited in `audit_logs` (`INTERNAL_NOTE_CREATED`, `INTERNAL_NOTE_UPDATED`, `INTERNAL_NOTE_DELETED`, `ISSUE_MESSAGE_SENT`, `ISSUE_MESSAGE_UPDATED`, `ISSUE_MESSAGE_DELETED`).
   - Records metadata and entity IDs without exposing sensitive content in audit rows.



