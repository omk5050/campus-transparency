package com.campus.transparency.api.issue;

import jakarta.validation.constraints.NotNull;

public record AssignIssueRequest(
        @NotNull(message = "User ID is required")
        Long userId,
        String department
) {}
