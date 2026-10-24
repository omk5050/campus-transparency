package com.campus.transparency.api.note;

import com.campus.transparency.application.note.InternalNoteService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues/{issueId}/internal-notes")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class InternalNoteController {

    private final InternalNoteService noteService;
    private final CurrentUserService currentUserService;

    public InternalNoteController(
            InternalNoteService noteService,
            CurrentUserService currentUserService
    ) {
        this.noteService = noteService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<InternalNoteResponse> listNotes(@PathVariable Long issueId) {
        User currentUser = currentUserService.getCurrentUser();
        return noteService.getInternalNotes(issueId, currentUser);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InternalNoteResponse createNote(
            @PathVariable Long issueId,
            @Valid @RequestBody CreateInternalNoteRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return noteService.createInternalNote(issueId, request, currentUser);
    }

    @PutMapping("/{noteId}")
    public InternalNoteResponse updateNote(
            @PathVariable Long issueId,
            @PathVariable Long noteId,
            @Valid @RequestBody UpdateInternalNoteRequest request
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return noteService.updateInternalNote(issueId, noteId, request, currentUser);
    }

    @DeleteMapping("/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(
            @PathVariable Long issueId,
            @PathVariable Long noteId
    ) {
        User currentUser = currentUserService.getCurrentUser();
        noteService.deleteInternalNote(issueId, noteId, currentUser);
    }
}
