package com.campus.transparency.api.issue;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateIssueRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 5000, message = "Description must be at most 5000 characters")
        String description,

        @NotBlank(message = "Reporter hash is required")
        @Size(max = 64, message = "Reporter hash must be at most 64 characters")
        String reporterHash
) {}
