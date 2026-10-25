package com.campus.transparency.api.forum;

import java.time.Instant;

public record ForumReplyResponse(
        Long id,
        Long postId,
        String authorAlias,
        String content,
        String status,
        Instant createdAt,
        Instant updatedAt,
        Instant editedAt,
        boolean isAuthor
) {}
