package com.campus.transparency.api.issue;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueStatus;

import java.time.Instant;

public record IssueResponse(
        Long id,
        String title,
        String description,
        IssueStatus status,
        boolean hidden,
        int voteCount,
        Instant createdAt,
        Instant updatedAt
) {

    public static IssueResponse from(Issue issue) {
        return new IssueResponse(
                issue.getId(),
                issue.getTitle(),
                issue.getDescription(),
                issue.getStatus(),
                issue.isHidden(),
                issue.getVoteCount(),
                issue.getCreatedAt(),
                issue.getUpdatedAt()
        );
    }
}
