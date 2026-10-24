package com.campus.transparency.api.organization;

import com.campus.transparency.domain.organization.OrganizationJoinCode;
import com.campus.transparency.domain.user.Role;

import java.time.Instant;

public record JoinCodeResponse(
        Long id,
        String code,
        Long organizationId,
        String organizationName,
        Role targetRole,
        String createdBy,
        Integer maxUses,
        int usedCount,
        Instant expiresAt,
        boolean revoked,
        Instant revokedAt,
        String revokedBy,
        boolean valid,
        Instant createdAt
) {
    public static JoinCodeResponse from(OrganizationJoinCode joinCode) {
        return new JoinCodeResponse(
                joinCode.getId(),
                joinCode.getCode(),
                joinCode.getOrganization().getId(),
                joinCode.getOrganization().getName(),
                joinCode.getTargetRole(),
                joinCode.getCreatedBy(),
                joinCode.getMaxUses(),
                joinCode.getUsedCount(),
                joinCode.getExpiresAt(),
                joinCode.isRevoked(),
                joinCode.getRevokedAt(),
                joinCode.getRevokedBy(),
                joinCode.isValid(),
                joinCode.getCreatedAt()
        );
    }
}
