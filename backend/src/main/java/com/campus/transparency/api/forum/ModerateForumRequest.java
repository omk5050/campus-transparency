package com.campus.transparency.api.forum;

import jakarta.validation.constraints.Size;

public record ModerateForumRequest(
        @Size(max = 500, message = "Reason cannot exceed 500 characters")
        String reason
) {}
