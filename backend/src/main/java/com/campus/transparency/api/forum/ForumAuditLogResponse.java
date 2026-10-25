package com.campus.transparency.api.forum;

import java.time.Instant;

public record ForumAuditLogResponse(
        Long id,
        Long organizationId,
        String actor,
        String action,
        String targetType,
        Long targetId,
        String reason,
        Instant createdAt
) {}
