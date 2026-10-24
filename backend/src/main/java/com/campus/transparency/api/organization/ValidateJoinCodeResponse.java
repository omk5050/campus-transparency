package com.campus.transparency.api.organization;

import com.campus.transparency.domain.user.Role;

import java.time.Instant;

public record ValidateJoinCodeResponse(
        boolean valid,
        String code,
        Long organizationId,
        String organizationName,
        String organizationType,
        Role targetRole,
        Instant expiresAt,
        String message
) {}
