package com.campus.transparency.api.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateForumReplyRequest(
        @NotBlank(message = "Content is required")
        @Size(max = 5000, message = "Content cannot exceed 5000 characters")
        String content
) {}
