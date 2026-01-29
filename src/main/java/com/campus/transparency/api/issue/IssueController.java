package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.application.issue.IssueQueryService;
import com.campus.transparency.domain.issue.Issue;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
@Validated
public class IssueController {

    private final IssueCommandService commandService;
    private final IssueQueryService queryService;

    public IssueController(
            IssueCommandService commandService,
            IssueQueryService queryService
    ) {
        this.commandService = commandService;
        this.queryService = queryService;
    }

    /* =========================
       COMMANDS
       ========================= */

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Issue create(@Valid @RequestBody CreateIssueRequest request) {
        return commandService.create(
                request.title(),
                request.description(),
                request.reporterHash()
        );
    }

    @PostMapping("/{id}/start")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void start(@PathVariable Long id) {
        commandService.startProgress(id);
    }

    @PostMapping("/{id}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resolve(@PathVariable Long id) {
        commandService.resolve(id);
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@PathVariable Long id) {
        commandService.reject(id);
    }

    /* =========================
       QUERIES
       ========================= */

    @GetMapping
    public List<Issue> publicFeed() {
        return queryService.getPublicIssues();
    }

    @GetMapping("/admin")
    public List<Issue> adminFeed() {
        return queryService.getAllIssuesForAdmin();
    }
}
