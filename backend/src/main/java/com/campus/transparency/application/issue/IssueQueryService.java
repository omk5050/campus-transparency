package com.campus.transparency.application.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueSpecification;
import com.campus.transparency.domain.issue.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class IssueQueryService {

    private final IssueRepository issueRepository;

    public IssueQueryService(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    @Transactional(readOnly = true)
    public Page<Issue> getPublicIssues(IssueStatus status, Instant startDate, Instant endDate, Pageable pageable) {
        Specification<Issue> spec = Specification.where(IssueSpecification.isNotHidden())
                .and(IssueSpecification.hasStatus(status))
                .and(IssueSpecification.createdAfter(startDate))
                .and(IssueSpecification.createdBefore(endDate));
        return issueRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getAllIssuesForAdmin(IssueStatus status, Instant startDate, Instant endDate, Pageable pageable) {
        Specification<Issue> spec = Specification.where(IssueSpecification.hasStatus(status))
                .and(IssueSpecification.createdAfter(startDate))
                .and(IssueSpecification.createdBefore(endDate));
        return issueRepository.findAll(spec, pageable);
    }
}
