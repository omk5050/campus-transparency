/**
 * ETHOS Mock Service Layer
 *
 * Each function mirrors a future REST API endpoint.
 * Replace the return values with real fetch() calls when connecting to the backend.
 *
 * GET    /reports                → getReports()
 * GET    /reports/:id            → getReport(id)
 * PATCH  /reports/:id            → updateReport(id, patch)
 * POST   /reports                → createReport(data)
 * GET    /reports/:id/messages   → getMessages(caseId)
 * POST   /reports/:id/messages   → sendMessage(caseId, message)
 * GET    /reports/:id/notes      → getInternalNotes(caseId)
 * POST   /reports/:id/notes      → addInternalNote(caseId, note)
 * GET    /reports/:id/assignment → getAssignment(caseId)
 * POST   /reports/:id/assignment → assignCase(caseId, assignment)
 * POST   /reports/:id/resolve    → resolveCase(caseId, resolution)
 * POST   /reports/:id/feedback   → submitFeedback(caseId, feedback)
 * GET    /notifications          → getNotifications()
 * PATCH  /notifications/:id/read → markNotificationRead(id)
 * GET    /moderation             → getModerationQueue()
 * PATCH  /moderation/:id         → reviewModerationItem(id, decision)
 * GET    /organizations/:id/workflow → getWorkflow(orgId)
 * PATCH  /organizations/:id/workflow → updateWorkflow(orgId, workflow)
 * GET    /organizations/:id/sla     → getSLARules(orgId)
 * PATCH  /organizations/:id/sla/:ruleId → updateSLARule(orgId, ruleId, rule)
 * GET    /platform/orgs          → getPlatformOrgs()
 * GET    /platform/metrics       → getPlatformMetrics()
 * GET    /platform/security      → getSecurityStatuses()
 */

import {
  reports as _reports,
  caseMessages,
  internalNotes,
  assignments,
  resolutions,
  notifications as _notifications,
  moderationQueue as _moderation,
  defaultWorkflow,
  slaRules as _slaRules,
  escalationRules as _escalationRules,
  platformOrgs,
  platformMetrics,
  securityStatuses,
  departments as _departments,
  categories as _categories,
  savedViews as _savedViews,
  issueClusters as _issueClusters,
  changeHistory,
  relatedCases,
  aiOverrides,
  resolutionFeedback,
  rolePermissions,
} from './data';

import type {
  Report, Message, InternalNote, Assignment, Resolution,
  Notification, ModerationItem, Workflow, SLARule, EscalationRule,
  PlatformOrg, PlatformMetrics, SecurityStatus, Department, Category,
  SavedView, IssueCluster, RelatedCase, ChangeEvent, AIOverride,
  ResolutionFeedback, RolePermissions,
  ReportStatus, Priority,
} from './types';

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReports(): Report[] {
  return _reports;
}

export function getReport(id: string): Report | undefined {
  return _reports.find(r => r.id === id);
}

export function updateReportStatus(id: string, status: ReportStatus): boolean {
  const r = _reports.find(r => r.id === id);
  if (r) { r.status = status; r.updatedAt = new Date().toISOString(); return true; }
  return false;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function getMessages(caseId: string): Message[] {
  return caseMessages[caseId] ?? [];
}

export function sendMessage(caseId: string, content: string, senderType: Message['senderType'], messageType: Message['messageType'], deadline?: string): Message {
  const msg: Message = {
    id: `MSG-${Date.now()}`,
    caseId,
    senderType,
    content,
    createdAt: new Date().toISOString(),
    messageType,
    requestDeadline: deadline,
  };
  if (!caseMessages[caseId]) caseMessages[caseId] = [];
  caseMessages[caseId].push(msg);
  return msg;
}

export function markMessagesRead(caseId: string, senderType: Message['senderType']): void {
  const msgs = caseMessages[caseId] ?? [];
  const now = new Date().toISOString();
  msgs.forEach(m => { if (m.senderType === senderType && !m.readAt) m.readAt = now; });
}

// ─── Internal Notes ───────────────────────────────────────────────────────────

export function getInternalNotes(caseId: string): InternalNote[] {
  return internalNotes[caseId] ?? [];
}

export function addInternalNote(caseId: string, content: string, authorId: string, authorName: string): InternalNote {
  const note: InternalNote = {
    id: `INT-${Date.now()}`,
    caseId,
    authorId,
    authorName,
    content,
    createdAt: new Date().toISOString(),
  };
  if (!internalNotes[caseId]) internalNotes[caseId] = [];
  internalNotes[caseId].push(note);
  return note;
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export function getAssignment(caseId: string): Assignment | undefined {
  return assignments[caseId];
}

export function assignCase(caseId: string, data: Omit<Assignment, 'id' | 'caseId' | 'assignedAt' | 'history'>): Assignment {
  const assignment: Assignment = {
    ...data,
    id: `ASN-${Date.now()}`,
    caseId,
    assignedAt: new Date().toISOString(),
    history: assignments[caseId]?.history ?? [],
  };
  assignments[caseId] = assignment;
  return assignment;
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export function getResolution(caseId: string): Resolution | undefined {
  return resolutions[caseId];
}

export function resolveCase(caseId: string, data: Omit<Resolution, 'id' | 'caseId' | 'resolvedAt'>): Resolution {
  const res: Resolution = {
    ...data,
    id: `RES-${Date.now()}`,
    caseId,
    resolvedAt: new Date().toISOString(),
  };
  resolutions[caseId] = res;
  return res;
}

export function getResolutionFeedback(caseId: string): ResolutionFeedback | undefined {
  return resolutionFeedback[caseId];
}

export function submitFeedback(caseId: string, rating: ResolutionFeedback['rating'], comment?: string): ResolutionFeedback {
  const fb: ResolutionFeedback = {
    id: `FB-${Date.now()}`,
    caseId,
    rating,
    comment,
    submittedAt: new Date().toISOString(),
  };
  resolutionFeedback[caseId] = fb;
  return fb;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function getNotifications(): Notification[] {
  return _notifications;
}

export function markNotificationRead(id: string): void {
  const n = _notifications.find(n => n.id === id);
  if (n) n.readAt = new Date().toISOString();
}

export function markAllNotificationsRead(): void {
  const now = new Date().toISOString();
  _notifications.forEach(n => { if (!n.readAt) n.readAt = now; });
}

export function getUnreadNotificationCount(): number {
  return _notifications.filter(n => !n.readAt && n.recipientType === 'INVESTIGATOR').length;
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export function getModerationQueue(): ModerationItem[] {
  return _moderation;
}

export function reviewModerationItem(id: string, decision: ModerationItem['humanDecision'], reviewer: string, note?: string): void {
  const item = _moderation.find(m => m.id === id);
  if (item) {
    item.humanDecision = decision;
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = reviewer;
    if (note) item.reviewNote = note;
  }
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export function getWorkflow(_orgId: string): Workflow {
  return defaultWorkflow;
}

// ─── SLA ──────────────────────────────────────────────────────────────────────

export function getSLARules(_orgId: string): SLARule[] {
  return _slaRules;
}

export function getEscalationRules(_orgId: string): EscalationRule[] {
  return _escalationRules;
}

// ─── Departments & Categories ─────────────────────────────────────────────────

export function getDepartments(orgId: string): Department[] {
  return _departments.filter(d => d.orgId === orgId);
}

export function getCategories(orgId: string): Category[] {
  return _categories.filter(c => c.orgId === orgId);
}

// ─── Saved Views ──────────────────────────────────────────────────────────────

export function getSavedViews(): SavedView[] {
  return _savedViews;
}

// ─── Case Extras ──────────────────────────────────────────────────────────────

export function getChangeHistory(caseId: string): ChangeEvent[] {
  return changeHistory[caseId] ?? [];
}

export function getRelatedCases(caseId: string): RelatedCase[] {
  return relatedCases[caseId] ?? [];
}

export function getAIOverrides(caseId: string): AIOverride[] {
  return aiOverrides[caseId] ?? [];
}

// ─── Clusters ─────────────────────────────────────────────────────────────────

export function getIssueClusters(): IssueCluster[] {
  return _issueClusters;
}

// ─── Platform ─────────────────────────────────────────────────────────────────

export function getPlatformOrgs(): PlatformOrg[] {
  return platformOrgs;
}

export function getPlatformMetrics(): PlatformMetrics {
  return platformMetrics;
}

export function getSecurityStatuses(): SecurityStatus[] {
  return securityStatuses;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export function getRolePermissions(): RolePermissions[] {
  return rolePermissions;
}
