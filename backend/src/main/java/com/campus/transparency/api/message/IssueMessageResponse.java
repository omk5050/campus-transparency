package com.campus.transparency.api.message;

import com.campus.transparency.domain.message.IssueMessage;

import java.time.Instant;

public record IssueMessageResponse(
        Long id,
        Long issueId,
        Long senderId,
        String senderUsername,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
    public static IssueMessageResponse from(IssueMessage message) {
        return new IssueMessageResponse(
                message.getId(),
                message.getIssue().getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getContent(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }
}
