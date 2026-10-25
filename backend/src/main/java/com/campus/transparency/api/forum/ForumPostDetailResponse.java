package com.campus.transparency.api.forum;

import java.time.Instant;

public record ForumPostDetailResponse(
        Long id,
        Long organizationId,
        String organizationName,
        String authorAlias,
        String title,
        String content,
        String category,
        String status,
        long replyCount,
        Instant createdAt,
        Instant updatedAt,
        Instant editedAt,
        boolean isLocked,
        boolean isAuthor,
        Instant moderatedAt,
        String moderationReason
) {}
