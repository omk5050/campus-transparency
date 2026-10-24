package com.campus.transparency.api.note;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateInternalNoteRequest(
        @NotBlank(message = "Content cannot be blank")
        @Size(max = 5000, message = "Content cannot exceed 5000 characters")
        String content
) {}
