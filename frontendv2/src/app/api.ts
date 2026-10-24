/**
 * Centralized API layer for campus-transparency frontendv2.
 *
 * All HTTP communication with the Spring Boot backend happens here.
 * Components and service functions MUST NOT make raw fetch() calls directly.
 *
 * Backend base: http://localhost:8080 (proxied via Vite as /api)
 *
 * Existing backend endpoints (authoritative — do not invent new ones):
 *   POST  /api/auth/login              → login
 *   GET   /api/issues                  → public paginated feed
 *   GET   /api/issues/admin            → admin paginated feed (all issues)
 *   POST  /api/issues                  → create issue
 *   POST  /api/issues/{id}/report      → transition → REPORTED
 *   POST  /api/issues/{id}/start       → transition → IN_PROGRESS
 *   POST  /api/issues/{id}/resolve     → transition → RESOLVED
 *   POST  /api/issues/{id}/reject      → transition → REJECTED
 *   POST  /api/issues/{id}/hide        → hide issue
 *   POST  /api/issues/{id}/upvote      → increment vote
 *   POST  /api/issues/{id}/downvote    → decrement vote
 *   POST  /api/issues/{id}/vote        → vote by delta (?delta=N)
 *   GET   /api/admin/audit             → audit logs (paginated)
 */

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'campus_transparency_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ─── Backend DTO types ────────────────────────────────────────────────────────

/**
 * Exact shape returned by Spring's Page<IssueResponse>.
 */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;        // current page (0-indexed)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AssignedUser {
  id: number;
  username: string;
  alias?: string;
}

/**
 * Exact fields returned by IssueResponse.java.
 * Fields NOT returned by the backend are not listed here.
 */
export interface BackendIssueResponse {
  id: number;                  // Long in Java → number in JS
  title: string;
  description: string;
  status: BackendIssueStatus;  // see enum below
  hidden: boolean;             // NOTE: frontend uses isHidden
  voteCount: number;
  reporterAlias: string;       // NOTE: frontend uses anonymousId
  trackingCode?: string;
  category?: string;
  department?: string;
  assignedTo?: AssignedUser | null;
  createdAt: string;           // ISO-8601 Instant
  updatedAt: string;
}

/**
 * Status values that the backend actually uses.
 * UNDER_REVIEW exists in backend; TRIAGED/PENDING_REVIEW/ARCHIVED do NOT.
 */
export type BackendIssueStatus =
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

/**
 * Exact fields returned by AuditLogResponse.java.
 */
export interface BackendAuditLogResponse {
  id: number;
  issueId: number;
  action: string;      // e.g. "ISSUE_CREATED", "STATUS_CHANGED"
  actor: string;       // e.g. "admin", "system"
  createdAt: string;   // ISO-8601 Instant
}

/**
 * Exact fields returned by GlobalExceptionHandler.ErrorResponse.
 */
export interface BackendErrorResponse {
  code: string;
  message: string;
  timestamp: string;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, { ...options, headers });

  // Successful 204 No Content responses
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const text = await response.text();

  if (!response.ok) {
    // Try to parse as BackendErrorResponse
    let code = String(response.status);
    let message = text || `HTTP ${response.status}`;
    try {
      const err: BackendErrorResponse = JSON.parse(text);
      code = err.code ?? code;
      message = err.message ?? message;
    } catch {
      // leave defaults
    }

    // 401 means token is expired / invalid — clear it so the UI can redirect to login
    if (response.status === 401) {
      clearToken();
    }

    throw new ApiError(response.status, code, message);
  }

  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Returns the raw JWT string on success.
 * Stores the token in localStorage.
 */
export async function login(username: string, password: string): Promise<string> {
  const data = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.token;
}

/** Remove the stored token (client-side logout). */
export function logout(): void {
  clearToken();
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export interface FeedParams {
  status?: BackendIssueStatus;
  department?: string;
  assignedTo?: number;
  unassigned?: boolean;
  startDate?: string;   // ISO-8601
  endDate?: string;     // ISO-8601
  page?: number;
  size?: number;
  sort?: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

/**
 * GET /api/issues
 * Public feed — hidden issues excluded.
 * Auth required (STUDENT or ADMIN role).
 */
export async function getPublicFeed(
  params: FeedParams = {},
): Promise<SpringPage<BackendIssueResponse>> {
  const { status, department, startDate, endDate, page = 0, size = 50, sort = 'createdAt,desc' } = params;
  const query = buildQuery({ status, department, startDate, endDate, page, size, sort });
  return request<SpringPage<BackendIssueResponse>>(`/issues${query}`);
}

/**
 * GET /api/issues/admin
 * Admin feed — includes hidden issues and assignment/department filters.
 * Auth required (ADMIN role).
 */
export async function getAdminFeed(
  params: FeedParams = {},
): Promise<SpringPage<BackendIssueResponse>> {
  const { status, department, assignedTo, unassigned, startDate, endDate, page = 0, size = 100, sort = 'createdAt,desc' } = params;
  const query = buildQuery({ status, department, assignedTo, unassigned, startDate, endDate, page, size, sort });
  return request<SpringPage<BackendIssueResponse>>(`/issues/admin${query}`);
}

/**
 * GET /api/issues/{id}
 * Fetch full details for a single issue.
 */
export async function getIssueById(id: string | number): Promise<BackendIssueResponse> {
  return request<BackendIssueResponse>(`/issues/${id}`);
}

/**
 * GET /api/issues/track/{trackingCode}
 * Public lookup for an issue by anonymous tracking code.
 */
export async function trackIssue(trackingCode: string): Promise<BackendIssueResponse> {
  return request<BackendIssueResponse>(`/issues/track/${encodeURIComponent(trackingCode)}`, { auth: false });
}

/**
 * POST /api/issues
 * Create a new issue.
 * Auth required (STUDENT role).
 * @param reporterHash - Opaque identifier for the anonymous reporter.
 */
export async function createIssue(
  title: string,
  description: string,
  reporterHash: string,
  category?: string,
  department?: string,
): Promise<BackendIssueResponse> {
  return request<BackendIssueResponse>('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      reporterHash,
      category: category || 'Infrastructure',
      department: department || 'Facilities & Operations',
    }),
  });
}

// ─── Issue status transitions ─────────────────────────────────────────────────
//
// The backend exposes separate action endpoints rather than a single PATCH.
// Each function maps directly to one backend endpoint.

/** POST /api/issues/{id}/report — revert to REPORTED. ADMIN only. */
export async function setStatusReported(id: string): Promise<void> {
  return request<void>(`/issues/${id}/report`, { method: 'POST' });
}

/** POST /api/issues/{id}/start — transition to IN_PROGRESS. ADMIN only. */
export async function setStatusInProgress(id: string): Promise<void> {
  return request<void>(`/issues/${id}/start`, { method: 'POST' });
}

/** POST /api/issues/{id}/resolve — transition to RESOLVED. ADMIN only. */
export async function setStatusResolved(id: string): Promise<void> {
  return request<void>(`/issues/${id}/resolve`, { method: 'POST' });
}

/** POST /api/issues/{id}/reject — transition to REJECTED. ADMIN only. */
export async function setStatusRejected(id: string): Promise<void> {
  return request<void>(`/issues/${id}/reject`, { method: 'POST' });
}

/** POST /api/issues/{id}/hide — hide issue. ADMIN only. */
export async function hideIssue(id: string): Promise<void> {
  return request<void>(`/issues/${id}/hide`, { method: 'POST' });
}

// ─── Case Assignment & Routing ────────────────────────────────────────────────

/**
 * POST /api/issues/{id}/assign
 * Assign an issue to an investigator/admin and optionally route department.
 * ADMIN only.
 */
export async function assignIssue(
  id: string | number,
  userId: number,
  department?: string,
): Promise<BackendIssueResponse> {
  return request<BackendIssueResponse>(`/issues/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId, department }),
  });
}

/**
 * POST /api/issues/{id}/unassign
 * Unassign an issue.
 * ADMIN only.
 */
export async function unassignIssue(
  id: string | number,
): Promise<BackendIssueResponse> {
  return request<BackendIssueResponse>(`/issues/${id}/unassign`, {
    method: 'POST',
  });
}

/**
 * GET /api/issues/assignees
 * Retrieve list of authorized staff/investigators eligible for assignment.
 * ADMIN only.
 */
export async function getAssignees(): Promise<AssignedUser[]> {
  return request<AssignedUser[]>('/issues/assignees');
}

// ─── Voting ───────────────────────────────────────────────────────────────────

/** POST /api/issues/{id}/upvote — increment vote count by 1. */
export async function upvoteIssue(id: string): Promise<void> {
  return request<void>(`/issues/${id}/upvote`, { method: 'POST' });
}

/** POST /api/issues/{id}/downvote — decrement vote count by 1. */
export async function downvoteIssue(id: string): Promise<void> {
  return request<void>(`/issues/${id}/downvote`, { method: 'POST' });
}

/**
 * POST /api/issues/{id}/vote?delta=N — change vote count by arbitrary delta.
 * @param delta positive = upvote delta, negative = downvote delta
 */
export async function voteIssue(id: string, delta: number): Promise<void> {
  return request<void>(`/issues/${id}/vote?delta=${delta}`, { method: 'POST' });
}

// ─── Audit ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit
 * Auth required (any authenticated user, but admin in practice).
 */
export async function getAuditLogs(
  page = 0,
  size = 100,
): Promise<SpringPage<BackendAuditLogResponse>> {
  const query = buildQuery({ page, size, sort: 'createdAt,desc' });
  return request<SpringPage<BackendAuditLogResponse>>(`/admin/audit${query}`);
}

// ─── Status transition dispatcher ─────────────────────────────────────────────

/**
 * Dispatch the correct backend endpoint based on the target status.
 *
 * Status mapping — backend vs frontend:
 *   REPORTED      → /report     (same in both)
 *   UNDER_REVIEW  → no direct FE equivalent; mapped FROM backend only
 *   IN_PROGRESS   → /start      (same in both)
 *   RESOLVED      → /resolve    (same in both)
 *   REJECTED      → /reject     (same in both)
 *
 * TRIAGED, PENDING_REVIEW, ARCHIVED exist only in the frontend mock.
 * They have no backend counterpart and CANNOT be sent to the backend.
 * Calling this function with those values throws immediately.
 */
export async function transitionStatus(
  id: string,
  targetStatus: BackendIssueStatus,
): Promise<void> {
  switch (targetStatus) {
    case 'REPORTED':
      return setStatusReported(id);
    case 'IN_PROGRESS':
      return setStatusInProgress(id);
    case 'RESOLVED':
      return setStatusResolved(id);
    case 'REJECTED':
      return setStatusRejected(id);
    case 'UNDER_REVIEW':
      // UNDER_REVIEW is a backend status but the backend has no transition endpoint
      // that directly sets UNDER_REVIEW. It is only reachable from REPORTED
      // via an admin action not yet surfaced in the API. Treat as unsupported for now.
      throw new Error('UNDER_REVIEW cannot be set via the current API. It is applied by the backend automatically.');
    default: {
      // TypeScript exhaustiveness guard
      const _: never = targetStatus;
      throw new Error(`Unknown status: ${_}`);
    }
  }
}

// Re-export ApiError so callers can instanceof-check it
export { ApiError };
