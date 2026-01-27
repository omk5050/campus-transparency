package com.application.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;

    public IssueCommandService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    @Transactional
    public Issue createIssue(String title, String description, String reporterHash) {
        Issue issue = new Issue(title, description, reporterHash);
        return issueRepository.save(issue);
    }
}
