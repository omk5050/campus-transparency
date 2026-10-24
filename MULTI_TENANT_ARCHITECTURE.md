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

The Phase 2.3 foundation leaves clean extension points for subsequent phases:
- **Phase 2.4+:**
  - Organization registration & Super Admin approval workflows (`PENDING`, `ACTIVE`, `REJECTED`).
  - Organization join codes for student/staff onboarding.
  - Anonymous identity redesign (complaint-specific privacy-preserving identifiers).
  - Internal Notes & Investigator Messaging (strictly scoped by `organization_id`).
  - Secure File Attachments.
  - Multi-tenant Notifications.
  - Public Aggregate Transparency Statistics & Leaderboards.
  - Official ETHOS Platform Forum & Announcement Channels.
