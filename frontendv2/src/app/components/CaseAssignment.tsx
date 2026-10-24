import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, Check, Clock, User, Shield, X, UserMinus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Assignment, Report } from '../types';
import { assignIssue, unassignIssue, getAssignees, type AssignedUser, ApiError } from '../api';
import { mapIssueToReport } from '../mapper';

const C = {
  bg: '#08090E', surface: '#0F1117', surface2: '#161921', surface3: '#1D2029',
  border: '#1E222B', border2: '#2D3140', cyan: '#00C8E8', text: '#E2E5EE',
  textSub: '#8A8FA8', textDim: '#52576A', emerald: '#10B981', amber: '#F59E0B',
  violet: '#8B5CF6', rose: '#F43F5E',
} as const;

const STANDARD_DEPARTMENTS = [
  'Facilities & Operations',
  'Campus Safety',
  'IT Services',
  'Student Services',
  'Academic Affairs',
];

interface CaseAssignmentProps {
  caseId: string;
  assignment?: Assignment;
  currentDepartment?: string;
  onAssigned: (updatedReport: Report) => void;
}

export function CaseAssignment({ caseId, assignment, currentDepartment, onAssigned }: CaseAssignmentProps) {
  const [editing, setEditing] = useState(!assignment);
  const [assignees, setAssignees] = useState<AssignedUser[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDept, setSelectedDept] = useState<string>(
    assignment?.departmentName || currentDepartment || 'Facilities & Operations'
  );
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    assignment?.primaryInvestigatorId ? Number(assignment.primaryInvestigatorId) : null
  );

  useEffect(() => {
    let isMounted = true;
    getAssignees()
      .then(users => {
        if (isMounted) {
          setAssignees(users);
          setLoadingAssignees(false);
          // If none selected, default to first available assignee
          if (!selectedUserId && users.length > 0) {
            setSelectedUserId(users[0].id);
          }
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load assignees', err);
          setLoadingAssignees(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (assignment) {
      setSelectedDept(assignment.departmentName || currentDepartment || 'Facilities & Operations');
      if (assignment.primaryInvestigatorId) {
        setSelectedUserId(Number(assignment.primaryInvestigatorId));
      }
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [assignment, currentDepartment]);

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error('Please select an investigator to assign.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await assignIssue(caseId, selectedUserId, selectedDept);
      const mapped = mapIssueToReport(updated);
      onAssigned(mapped);
      setEditing(false);
      toast.success('Case assigned successfully');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to assign case.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setSubmitting(true);
    try {
      const updated = await unassignIssue(caseId);
      const mapped = mapIssueToReport(updated);
      onAssigned(mapped);
      setEditing(false);
      toast.success('Case unassigned successfully');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to unassign case.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current assignment card */}
      {assignment && !editing && (
        <div className="border p-5 space-y-4" style={{ borderColor: C.border, background: C.surface }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} style={{ color: C.emerald }} />
              <div className="font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: C.emerald }}>
                Active Assignment
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEditing(true)}
                className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-opacity hover:opacity-80"
                style={{ color: C.cyan, borderColor: `${C.cyan}40`, background: `${C.cyan}0A` }}
              >
                Reassign / Route
              </button>
              <button
                onClick={handleUnassign}
                disabled={submitting}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-opacity hover:opacity-80 text-rose-400 disabled:opacity-50"
                style={{ borderColor: `${C.rose}40`, background: `${C.rose}0A` }}
              >
                <UserMinus size={11} />
                Unassign
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Routing Department</div>
              <div className="font-mono text-xs font-medium" style={{ color: C.text }}>{assignment.departmentName || '—'}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Primary Investigator</div>
              <div className="font-mono text-xs font-medium flex items-center gap-1.5" style={{ color: C.cyan }}>
                <User size={12} />
                {assignment.primaryInvestigatorName || '—'}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Assigned By</div>
              <div className="font-mono text-xs" style={{ color: C.textSub }}>{assignment.assignedBy || 'admin'}</div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.textDim }}>Timestamp</div>
              <div className="font-mono text-xs" style={{ color: C.textSub }}>
                {assignment.assignedAt ? format(new Date(assignment.assignedAt), 'dd MMM yyyy, HH:mm') : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment / Routing Form */}
      {editing && (
        <div className="border p-5 space-y-5" style={{ borderColor: C.border, background: C.surface }}>
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest font-semibold" style={{ color: C.text }}>
              {assignment ? 'Reassign & Route Case' : 'Assign Investigator & Route Department'}
            </div>
            {assignment && (
              <button onClick={() => setEditing(false)} style={{ color: C.textDim }} title="Cancel">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Selection */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
              Routing Department
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STANDARD_DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className="flex items-center justify-between px-3.5 py-2.5 border text-left transition-all"
                  style={{
                    borderColor: selectedDept === dept ? C.cyan : C.border,
                    background: selectedDept === dept ? `${C.cyan}0C` : 'transparent',
                  }}
                >
                  <span className="font-mono text-xs" style={{ color: selectedDept === dept ? C.cyan : C.text }}>
                    {dept}
                  </span>
                  {selectedDept === dept && <Check size={12} style={{ color: C.cyan }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Investigator Selection */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textDim }}>
              Select Authorized Staff / Investigator *
            </label>
            {loadingAssignees ? (
              <div className="font-mono text-[10px] py-3 text-center" style={{ color: C.textDim }}>
                Loading authorized staff from database...
              </div>
            ) : assignees.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border font-mono text-xs text-amber-400" style={{ borderColor: `${C.amber}40`, background: `${C.amber}0A` }}>
                <AlertCircle size={14} />
                No administrative users found eligible for assignment.
              </div>
            ) : (
              <div className="space-y-1.5">
                {assignees.map(inv => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedUserId(inv.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border text-left transition-all"
                    style={{
                      borderColor: selectedUserId === inv.id ? C.cyan : C.border,
                      background: selectedUserId === inv.id ? `${C.cyan}0C` : 'transparent',
                    }}
                  >
                    <User size={13} style={{ color: selectedUserId === inv.id ? C.cyan : C.textDim }} />
                    <div className="flex-1">
                      <div className="font-mono text-xs font-semibold" style={{ color: selectedUserId === inv.id ? C.cyan : C.text }}>
                        {inv.alias || inv.username}
                      </div>
                      <div className="font-mono text-[9px]" style={{ color: C.textDim }}>
                        User ID: {inv.id} · Role: Administrator / Investigator
                      </div>
                    </div>
                    {selectedUserId === inv.id && <Check size={13} style={{ color: C.cyan }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.border }}>
            {assignment ? (
              <button
                type="button"
                onClick={handleUnassign}
                disabled={submitting}
                className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-rose-400 hover:text-rose-300 disabled:opacity-40"
              >
                <UserMinus size={13} />
                Unassign Case
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              {assignment && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: C.textDim }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedUserId || submitting}
                className="flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-widest font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
                style={{ background: C.cyan, color: C.bg }}
              >
                <Users size={13} />
                {submitting ? 'Saving...' : assignment ? 'Update Assignment' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
