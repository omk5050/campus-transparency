package com.campus.transparency.api.forum;

import java.time.Instant;

public record ForumPostSummaryResponse(
        Long id,
        Long organizationId,
        String organizationName,
        String authorAlias,
        String title,
        String contentSnippet,
        String category,
        String status,
        long replyCount,
        Instant createdAt,
        Instant updatedAt,
        Instant editedAt,
        boolean isLocked
) {}
