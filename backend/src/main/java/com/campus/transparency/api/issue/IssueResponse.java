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
        String reporterAlias,
        String trackingCode,
        String category,
        String department,
        AssignedUserResponse assignedTo,
        Instant createdAt,
        Instant updatedAt
) {

    public static IssueResponse from(Issue issue) {
        return from(issue, issue.getReporterAlias());
    }

    public static IssueResponse from(Issue issue, String reporterAlias) {
        String effectiveAlias = (reporterAlias != null && !reporterAlias.isBlank())
                ? reporterAlias
                : (issue.getReporterAlias() != null ? issue.getReporterAlias() : "Complainant #0000");
        return new IssueResponse(
                issue.getId(),
                issue.getTitle(),
                issue.getDescription(),
                issue.getStatus(),
                issue.isHidden(),
                issue.getVoteCount(),
                effectiveAlias,
                issue.getTrackingCode(),
                issue.getCategory(),
                issue.getDepartment(),
                AssignedUserResponse.from(issue.getAssignedTo()),
                issue.getCreatedAt(),
                issue.getUpdatedAt()
        );
    }

    public static IssueResponse forPublicTracking(Issue issue) {
        return forPublicTracking(issue, issue.getReporterAlias());
    }

    public static IssueResponse forPublicTracking(Issue issue, String reporterAlias) {
        String effectiveAlias = (reporterAlias != null && !reporterAlias.isBlank())
                ? reporterAlias
                : (issue.getReporterAlias() != null ? issue.getReporterAlias() : "Complainant #0000");
        return new IssueResponse(
                issue.getId(),
                issue.getTitle(),
                issue.getDescription(),
                issue.getStatus(),
                false,
                issue.getVoteCount(),
                effectiveAlias,
                issue.getTrackingCode(),
                issue.getCategory(),
                issue.getDepartment(),
                null,
                issue.getCreatedAt(),
                issue.getUpdatedAt()
        );
    }
}
