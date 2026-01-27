package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.domain.issue.Issue;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
public class IssueCommandController {

    private final IssueCommandService commandService;

    public IssueCommandController(IssueCommandService commandService) {
        this.commandService = commandService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Issue create(@RequestBody CreateIssueRequest request) {
        return commandService.create(
                request.title(),
                request.description(),
                request.reporterHash()
        );
    }

    @PatchMapping("/{id}/progress")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void startProgress(@PathVariable Long id) {
        commandService.startProgress(id);
    }

    @PatchMapping("/{id}/resolve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resolve(@PathVariable Long id) {
        commandService.resolve(id);
    }

    @PatchMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@PathVariable Long id) {
        commandService.reject(id);
    }
}
