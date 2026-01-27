package com.application.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class IssueQueryService {

    private final IssueRepository issueRepository;

    public IssueQueryService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    /**
     * Public feed – hidden issues excluded.
     */
    @Transactional(readOnly = true)
    public List<Issue> getPublicIssues() {
        return issueRepository.findByHiddenFalse();
    }

    /**
     * Admin / Authority feed – includes hidden issues.
     */
    @Transactional(readOnly = true)
    public List<Issue> getAllIssuesForAdmin() {
        return issueRepository.findAllIncludingHidden();
    }
}
