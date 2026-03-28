package com.campus.transparency.application.issue;

import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;

    public IssueCommandService(IssueRepository issueRepository, AuditLogRepository auditLogRepository) {
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /* =========================
       COMMANDS
       ========================= */

    @Transactional
    public Issue create(String title, String description, String reporterHash) {
        Issue issue = new Issue(title, description, reporterHash);
        issue = issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, "ISSUE_CREATED", "system"));
        return issue;
    }

    @Transactional
    public void report(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REPORTED, "STATUS_CHANGED", "admin");
    }

    @Transactional
    public void startProgress(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.IN_PROGRESS, "STATUS_CHANGED", "admin");
    }

    @Transactional
    public void resolve(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.RESOLVED, "ISSUE_RESOLVED", "admin");
    }

    @Transactional
    public void reject(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REJECTED, "ISSUE_REJECTED", "admin");
    }

    @Transactional
    public void hide(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.hide();
        issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, "ISSUE_HIDDEN", "admin"));
    }

    @Transactional
    public void upvote(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.upvote();
        issueRepository.save(issue);
    }

    @Transactional
    public void downvote(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.downvote();
        issueRepository.save(issue);
    }

    /* =========================
       INTERNALS
       ========================= */

    private Issue getIssue(Long id) {
        return issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + id));
    }

    private void transition(Issue issue, IssueStatus targetStatus, String action, String actor) {
        issue.transitionTo(targetStatus);   // ✅ DOMAIN ENFORCES RULES
        issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, action, actor));
    }
}

