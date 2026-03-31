package com.campus.transparency.application.audit;

import java.time.Instant;

public record AuditLogResponse(
    Long id,
    Long issueId,
    String action,
    String actor,
    Instant createdAt
) {}
