package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.AnonymousTagService;
import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.application.issue.IssueQueryService;
import com.campus.transparency.domain.issue.Issue;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private static final Logger log = LoggerFactory.getLogger(IssueController.class);

    private final IssueCommandService commandService;
    private final IssueQueryService queryService;
    private final AnonymousTagService tagService;

    public IssueController(
            IssueCommandService commandService,
            IssueQueryService queryService,
            AnonymousTagService tagService
    ) {
        this.commandService = commandService;
        this.queryService = queryService;
        this.tagService = tagService;
    }

    
    //---COMMANDS
    

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STUDENT')")
    public IssueResponse create(@Valid @RequestBody CreateIssueRequest request) {
        Issue issue = commandService.create(
                request.title(),
                request.description(),
                request.reporterHash(),
                request.category(),
                request.department()
        );
        log.info("Student created new issue titled '{}' (pseudonym: {})", issue.getTitle(), issue.getReporterAlias());
        return IssueResponse.from(issue);
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
    @PreAuthorize("hasAnyRole('ADMIN', 'INVESTIGATOR')")
    public void startProgress(@PathVariable Long id) {
        log.info("Starting progress on issue {}", id);
        commandService.startProgress(id);
    }

    @PostMapping("/{id}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'INVESTIGATOR')")
    public void resolve(@PathVariable Long id) {
        log.info("Resolving issue {}", id);
        commandService.resolve(id);
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'INVESTIGATOR')")
    public void reject(@PathVariable Long id) {
        log.info("Rejecting issue {}", id);
        commandService.reject(id);
    }

    @PostMapping("/{id}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public void hide(@PathVariable Long id) {
        log.info("Admin hiding issue {}", id);
        commandService.hide(id);
    }

    @PostMapping("/{id}/unhide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public void unhide(@PathVariable Long id) {
        log.info("Admin unhiding issue {}", id);
        commandService.unhide(id);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public IssueResponse assign(
            @PathVariable Long id,
            @Valid @RequestBody AssignIssueRequest request,
            java.security.Principal principal
    ) {
        String actor = principal != null ? principal.getName() : "admin";
        log.info("Admin {} assigning issue {} to user {} (dept: {})", actor, id, request.userId(), request.department());
        Issue issue = commandService.assign(id, request.userId(), request.department(), actor);
        return IssueResponse.from(issue);
    }

    @PostMapping("/{id}/unassign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public IssueResponse unassign(
            @PathVariable Long id,
            java.security.Principal principal
    ) {
        String actor = principal != null ? principal.getName() : "admin";
        log.info("Admin {} unassigning issue {}", actor, id);
        Issue issue = commandService.unassign(id, actor);
        return IssueResponse.from(issue);
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
    
    @PostMapping("/{id}/vote")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public void vote(@PathVariable Long id, @RequestParam int delta) {
        log.info("Voting on issue {} with delta {}", id, delta);
        commandService.vote(id, delta);
    }

    /* =========================
       QUERIES
       ========================= */

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public Page<IssueResponse> publicFeed(
            @RequestParam(required = false) com.campus.transparency.domain.issue.IssueStatus status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getPublicIssues(status, department, startDate, endDate, PageRequest.of(page, size))
                .map(IssueResponse::from);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<IssueResponse> adminFeed(
            @RequestParam(required = false) com.campus.transparency.domain.issue.IssueStatus status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Long assignedTo,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getAllIssuesForAdmin(status, department, assignedTo, unassigned, startDate, endDate, PageRequest.of(page, size))
                .map(IssueResponse::from);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public Page<IssueResponse> myComplaints(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getMyComplaints(PageRequest.of(page, size))
                .map(IssueResponse::from);
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasAnyRole('INVESTIGATOR', 'ADMIN')")
    public Page<IssueResponse> assignedComplaints(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return queryService.getAssignedComplaints(PageRequest.of(page, size))
                .map(IssueResponse::from);
    }

    @GetMapping("/assignees")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public java.util.List<AssignedUserResponse> getAssignees() {
        return queryService.getAssignableUsers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'INVESTIGATOR', 'ADMIN', 'SUPER_ADMIN')")
    public IssueResponse getById(@PathVariable Long id) {
        Issue issue = queryService.getById(id);
        return IssueResponse.from(issue);
    }

    @GetMapping("/track/{trackingCode}")
    public IssueResponse getByTrackingCode(@PathVariable String trackingCode) {
        Issue issue = queryService.getByTrackingCode(trackingCode);
        return IssueResponse.forPublicTracking(issue);
    }
}
