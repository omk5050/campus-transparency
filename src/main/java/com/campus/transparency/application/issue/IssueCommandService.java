package com.campus.transparency.application.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.lifecycle.LifecycleEnforcementService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;
    private final LifecycleEnforcementService lifecycleEnforcementService;

    public IssueCommandService(
            IssueRepository issueRepository,
            LifecycleEnforcementService lifecycleEnforcementService
    ) {
        this.issueRepository = issueRepository;
        this.lifecycleEnforcementService = lifecycleEnforcementService;
    }

    @Transactional
    public Issue createIssue(String title, String description, String reporterHash) {
        Issue issue = new Issue(title, description, reporterHash);
        return issueRepository.save(issue);
    }
}
