package com.campus.transparency.api.attachment;

import com.campus.transparency.domain.attachment.IssueAttachment;

import java.time.Instant;

public record IssueAttachmentResponse(
        Long id,
        Long issueId,
        String originalFilename,
        String secureUrl,
        String resourceType,
        String format,
        Long bytes,
        Integer width,
        Integer height,
        Instant createdAt,
        String uploadedByUsername
) {
    public static IssueAttachmentResponse from(IssueAttachment attachment) {
        return new IssueAttachmentResponse(
                attachment.getId(),
                attachment.getIssue().getId(),
                attachment.getOriginalFilename(),
                attachment.getSecureUrl(),
                attachment.getResourceType(),
                attachment.getFormat(),
                attachment.getBytes(),
                attachment.getWidth(),
                attachment.getHeight(),
                attachment.getCreatedAt(),
                attachment.getUploadedBy() != null ? attachment.getUploadedBy().getUsername() : null
        );
    }
}
