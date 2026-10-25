package com.campus.transparency.api.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateForumPostRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title cannot exceed 255 characters")
        String title,

        @NotBlank(message = "Content is required")
        @Size(max = 10000, message = "Content cannot exceed 10000 characters")
        String content,

        String category
) {}
