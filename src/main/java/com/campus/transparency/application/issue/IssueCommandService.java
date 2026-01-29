package com.campus.transparency.application.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;

    public IssueCommandService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    /* =========================
       COMMANDS
       ========================= */

    @Transactional
    public Issue create(String title, String description, String reporterHash) {
        Issue issue = new Issue(title, description, reporterHash);
        return issueRepository.save(issue);
    }

    @Transactional
    public void startProgress(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.IN_PROGRESS);
    }

    @Transactional
    public void resolve(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.RESOLVED);
    }

    @Transactional
    public void reject(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REJECTED);
    }

    /* =========================
       INTERNALS
       ========================= */

    private Issue getIssue(Long id) {
        return issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + id));
    }

    private void transition(Issue issue, IssueStatus targetStatus) {
        issue.transitionTo(targetStatus);   // ✅ DOMAIN ENFORCES RULES
        issueRepository.save(issue);
    }
}
