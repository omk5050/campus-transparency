package com.campus.transparency.api.organization;

import com.campus.transparency.domain.user.Role;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateJoinCodeRequest(
        @NotNull(message = "Target role is required (STUDENT or ADMIN)")
        Role targetRole,

        @Min(value = 1, message = "Maximum uses must be at least 1")
        @Max(value = 100000, message = "Maximum uses cannot exceed 100000")
        Integer maxUses,

        @Min(value = 1, message = "Expiration in days must be at least 1")
        @Max(value = 365, message = "Expiration in days cannot exceed 365")
        Integer expiresInDays,

        @Size(max = 12, message = "Prefix must not exceed 12 characters")
        String customPrefix,

        Long organizationId
) {}
