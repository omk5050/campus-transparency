package com.campus.transparency.api.message;

import com.campus.transparency.application.message.IssueMessageService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues/{issueId}/messages")
@PreAuthorize("hasAnyRole('INVESTIGATOR', 'ADMIN', 'SUPER_ADMIN')")
public class IssueMessageController {

    private final IssueMessageService messageService;
    private final CurrentUserService currentUserService;

    public IssueMessageController(
            IssueMessageService messageService,
            CurrentUserService currentUserService
    ) {
        this.messageService = messageService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<IssueMessageResponse> listMessages(@PathVariable Long issueId) {
        User currentUser = currentUserService.getCurrentUser();
        return messageService.getMessages(issueId, currentUser);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueMessageResponse createMessage(
            @PathVariable Long issueId,
            @Valid @RequestBody CreateIssueMessageRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return messageService.createMessage(issueId, request, currentUser);
    }

    @PutMapping("/{messageId}")
    public IssueMessageResponse updateMessage(
            @PathVariable Long issueId,
            @PathVariable Long messageId,
            @Valid @RequestBody UpdateIssueMessageRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return messageService.updateMessage(issueId, messageId, request, currentUser);
    }

    @DeleteMapping("/{messageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMessage(
            @PathVariable Long issueId,
            @PathVariable Long messageId
    ) {
        User currentUser = currentUserService.getCurrentUser();
        messageService.deleteMessage(issueId, messageId, currentUser);
    }
}
