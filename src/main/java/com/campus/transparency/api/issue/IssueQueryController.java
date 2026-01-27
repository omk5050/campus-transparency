package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueQueryService;
import com.campus.transparency.domain.issue.Issue;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
public class IssueQueryController {

    private final IssueQueryService queryService;

    public IssueQueryController(IssueQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public List<Issue> getPublicIssues() {
        return queryService.getPublicIssues();
    }

    @GetMapping("/admin")
    public List<Issue> getAllIssuesForAdmin() {
        return queryService.getAllIssuesForAdmin();
    }
}
