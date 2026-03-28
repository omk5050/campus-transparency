package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.application.issue.IssueQueryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
@Validated
public class IssueController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(IssueController.class);

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
    @PreAuthorize("hasRole('STUDENT')")
    public IssueResponse create(@Valid @RequestBody CreateIssueRequest request) {
        log.info("Student {} creating new issue titled '{}'", request.reporterHash(), request.title());
        return IssueResponse.from(
                commandService.create(
                        request.title(),
                        request.description(),
                        request.reporterHash()
                )
        );
    }

    @PostMapping("/{id}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void report(@PathVariable Long id) {
        log.info("Admin reverting issue {} to reported", id);
        commandService.report(id);
    }

    @PostMapping("/{id}/start")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void start(@PathVariable Long id) {
        log.info("Admin starting progress on issue {}", id);
        commandService.startProgress(id);
    }

    @PostMapping("/{id}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void resolve(@PathVariable Long id) {
        log.info("Admin resolving issue {}", id);
        commandService.resolve(id);
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void reject(@PathVariable Long id) {
        log.info("Admin rejecting issue {}", id);
        commandService.reject(id);
    }

    @PostMapping("/{id}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void hide(@PathVariable Long id) {
        log.info("Admin hiding issue {}", id);
        commandService.hide(id);
    }

    @PostMapping("/{id}/upvote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public void upvote(@PathVariable Long id) {
        log.info("Upvoting issue {}", id);
        commandService.upvote(id);
    }

    @PostMapping("/{id}/downvote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public void downvote(@PathVariable Long id) {
        log.info("Downvoting issue {}", id);
        commandService.downvote(id);
    }

    /* =========================
       QUERIES
       ========================= */

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public Page<IssueResponse> publicFeed(
            @RequestParam(required = false) com.campus.transparency.domain.issue.IssueStatus status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getPublicIssues(status, startDate, endDate, PageRequest.of(page, size))
                .map(IssueResponse::from);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<IssueResponse> adminFeed(
            @RequestParam(required = false) com.campus.transparency.domain.issue.IssueStatus status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getAllIssuesForAdmin(status, startDate, endDate, PageRequest.of(page, size))
                .map(IssueResponse::from);
    }
}

