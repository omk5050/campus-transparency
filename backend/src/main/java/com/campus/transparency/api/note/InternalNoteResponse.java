package com.campus.transparency.api.note;

import com.campus.transparency.domain.note.InternalNote;

import java.time.Instant;

public record InternalNoteResponse(
        Long id,
        Long issueId,
        Long authorId,
        String authorUsername,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
    public static InternalNoteResponse from(InternalNote note) {
        return new InternalNoteResponse(
                note.getId(),
                note.getIssue().getId(),
                note.getAuthor().getId(),
                note.getAuthor().getUsername(),
                note.getContent(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
