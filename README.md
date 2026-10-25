# ETHOS — Ethical Governance System

ETHOS is an enterprise multi-tenant ethical governance and campus transparency platform designed to ensure institutional accountability, anonymous whistleblower protection, and community discourse.

---

## 🏛️ Architecture & Core Domains

### 1. Platform Domains
- **Authentication & RBAC**: JWT-based session security with granular role boundaries (`STUDENT`, `INVESTIGATOR`, `ADMIN`, `SUPER_ADMIN`).
- **Organizations & Multi-Tenancy**: Complete tenant isolation where all organizational data is partitioned by `organization_id` derived strictly from authenticated server context.
- **Complaint Lifecycle**: Anonymous submission, review, investigation, resolution, and rejection workflows with SLA enforcement.
- **Anonymous Identity**: Dual-pseudonymization architecture:
  - Complaint-specific aliases (e.g., `Complainant #A1B2`) unique per complaint.
  - Forum-specific aliases (e.g., `Member #9482`) completely unlinked from complaint records.
  - `reporterHash` and reporter IDs are kept strictly private on the backend and never exposed.
- **Evidence Workspace**: Cloudinary integration for evidence attachments with signed URLs, file validation, and cross-tenant safeguards.
- **Case Communication**: Segregated public/student messaging and staff-only internal investigation notes (`Staff Confidential`).
- **Notifications**: Real-time event notifications for case status updates, assignments, and notes with unread count badges.
- **Organization Statistics & ETHOS Score**: Deterministic transparency scoring (0–100) computed from resolution rates, response speeds, and volume thresholds (`QUALIFIED` vs `PROVISIONAL`).
- **Public Transparency & Leaderboard**: Open public benchmarks accessible without login; exposes aggregate metrics with zero leakage of private complaints.
- **Public Forum & Moderation**: Open community discussions with category filtering, search, reply threads, and strict rate limiting.
- **Super Admin Governance**: Cross-tenant moderation, institutional application approval, join-code provisioning, and audit log analysis.

---

## 🔒 Security & Privacy Model

### Public Privacy Rule
```text
Public layer  = aggregate transparency metrics + approved forum content + safe tracking
Private layer = individual complaints, evidence, internal notes, and case-management data
```

### Security Foundations
- **Server-Derived Context**: The backend never trusts client-supplied organization IDs for authorization.
- **DTO Separation**: Sensitive fields (`reporterHash`, user IDs, internal notes, investigator identities) are scrubbed from public endpoints.
- **Anti-Spam & Rate Limiting**: In-memory token-bucket rate limiting protects complaint creation and public forum replies.
- **Immutable Audit Logging**: Every state change, assignment, unassignment, and moderation action is recorded with actor and timestamp.

---

## 👥 Role Matrix

| Capability | Student | Investigator | Admin | Super Admin | Public |
|---|:---:|:---:|:---:|:---:|:---:|
| Submit complaint | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own complaints | ✅ | ❌ | ✅ (Org) | ✅ (All) | ❌ |
| Assigned cases | ❌ | ✅ | ✅ (Org) | ✅ (All) | ❌ |
| Internal notes | ❌ | ✅ | ✅ | ✅ | ❌ |
| Evidence access | Own / Permitted | Assigned | Org Cases | Platform | ❌ |
| Forum participation | ✅ | ✅ | ✅ | ✅ | Read-only |
| Forum moderation | ❌ | ❌ | ✅ (Org) | ✅ (Platform) | ❌ |
| Leaderboard & Transparency | ✅ | ✅ | ✅ | ✅ | ✅ |
| Platform governance | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 🛠️ Technology Stack

- **Backend**: Java 21, Spring Boot 3.5, Spring Security 6, Spring Data JPA, Hibernate, PostgreSQL, Flyway (V1–V14).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Recharts.
- **Evidence Storage**: Cloudinary (server-side signed asset uploads).

---

## 🚀 Getting Started

### Prerequisites
- **Java 21** or higher.
- **Node.js** (v20+ recommended).
- **PostgreSQL** database.

### 1. Run the Backend
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
*Runs on port 8080. Database schema is automatically managed via Flyway migrations.*

### 2. Run the Frontend
```bash
cd frontendv2
npm install
npm run dev
```
*Runs on port 5173 (proxied to `/api` at `http://localhost:8080`).*

### 3. Production Frontend Build
```bash
cd frontendv2
npm run build
```

---

## 🔐 Pre-Seeded Default Accounts

| Role | Username | Password | Organization |
|---|---|---|---|
| **Super Admin** | `superadmin` | `admin123` | Platform Governance |
| **Org Admin** | `admin` | `admin123` | Northfield University |
| **Investigator** | `investigator` | `password` | Northfield University |
| **Student** | `student` | `student123` | Northfield University |

---

## 📜 Verification & Status
- **Backend Test Suite**: 174 tests, 0 failures, 0 errors, 0 skipped (`BUILD SUCCESS`).
- **Frontend Production Build**: Clean production build (`vite v6.3.5`, 0 errors).
- **Security Scan**: Clean (no exposed secrets, tokens, or credentials).
