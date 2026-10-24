package com.campus.transparency.api.attachment;

import com.campus.transparency.application.attachment.IssueAttachmentService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/issues/{issueId}/attachments")
public class IssueAttachmentController {

    private final IssueAttachmentService attachmentService;
    private final CurrentUserService currentUserService;

    public IssueAttachmentController(
            IssueAttachmentService attachmentService,
            CurrentUserService currentUserService
    ) {
        this.attachmentService = attachmentService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'SUPER_ADMIN')")
    public List<IssueAttachmentResponse> getAttachments(@PathVariable Long issueId) {
        User currentUser = currentUserService.getCurrentUser();
        return attachmentService.getAttachments(issueId, currentUser);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public IssueAttachmentResponse uploadAttachment(
            @PathVariable Long issueId,
            @RequestParam("file") MultipartFile file
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return attachmentService.uploadAttachment(issueId, file, currentUser);
    }

    @DeleteMapping("/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public void deleteAttachment(
            @PathVariable Long issueId,
            @PathVariable Long attachmentId
    ) {
        User currentUser = currentUserService.getCurrentUser();
        attachmentService.deleteAttachment(issueId, attachmentId, currentUser);
    }
}
