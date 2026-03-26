package com.campus.transparency.application.issue;

import com.campus.transparency.application.audit.AuditService;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;
    private final AuditService auditService;

    public IssueCommandService(IssueRepository issueRepository,
            AuditService auditService) {
        this.issueRepository = issueRepository;
        this.auditService = auditService;
    }

    /*
     * =========================
     * COMMANDS
     * =========================
     */

    @Transactional
    public Issue create(String title, String description, String reporterHash) {
        Issue issue = new Issue(title, description, reporterHash);
        Issue saved = issueRepository.save(issue);

        // ✅ AUDIT
        auditService.log("ISSUE_CREATED", reporterHash, saved.getId());

        return saved;
    }

    @Transactional
    public void startProgress(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.IN_PROGRESS);

        // ✅ AUDIT
        auditService.log("STATUS_CHANGED_TO_IN_PROGRESS", "ADMIN", issue.getId());
    }

    @Transactional
    public void reject(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REJECTED);

        auditService.log("ISSUE_REJECTED", "ADMIN", issue.getId());
    }

    @Transactional
    public void resolve(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.RESOLVED);

        // ✅ AUDIT
        auditService.log("ISSUE_RESOLVED", "ADMIN", issue.getId());
    }

    @Transactional
    public void review(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.UNDER_REVIEW);

        auditService.log("STATUS_CHANGED_TO_UNDER_REVIEW", "ADMIN", issue.getId());
    }

    /*
     * =========================
     * INTERNALS
     * =========================
     */

    private Issue getIssue(Long id) {
        return issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + id));
    }

    private void transition(Issue issue, IssueStatus targetStatus) {
        issue.transitionTo(targetStatus); // DOMAIN RULES
        issueRepository.save(issue);
    }
}