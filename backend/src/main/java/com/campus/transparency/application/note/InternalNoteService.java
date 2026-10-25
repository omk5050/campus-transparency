package com.campus.transparency.application.note;

import com.campus.transparency.api.note.CreateInternalNoteRequest;
import com.campus.transparency.api.note.InternalNoteResponse;
import com.campus.transparency.api.note.UpdateInternalNoteRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.note.InternalNote;
import com.campus.transparency.domain.note.InternalNoteRepository;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InternalNoteService {

    private final InternalNoteRepository internalNoteRepository;
    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;

    public InternalNoteService(
            InternalNoteRepository internalNoteRepository,
            IssueRepository issueRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.internalNoteRepository = internalNoteRepository;
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<InternalNoteResponse> getInternalNotes(Long issueId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        List<InternalNote> notes;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            notes = internalNoteRepository.findByIssueIdOrderByCreatedAtAsc(issueId);
        } else {
            notes = internalNoteRepository.findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(
                    issueId, currentUser.getOrganization().getId());
        }

        return notes.stream().map(InternalNoteResponse::from).toList();
    }

    @Transactional
    public InternalNoteResponse createInternalNote(Long issueId, CreateInternalNoteRequest request, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Note content cannot be blank");
        }
        if (request.content().length() > 5000) {
            throw new IllegalArgumentException("Note content cannot exceed 5000 characters");
        }

        InternalNote note = new InternalNote(
                issue,
                currentUser,
                issue.getOrganization(),
                request.content().trim()
        );

        InternalNote saved = internalNoteRepository.save(note);

        auditLogRepository.save(new AuditLog(
                issue,
                "INTERNAL_NOTE_CREATED",
                currentUser.getUsername() + " (Note ID: " + saved.getId() + ")"
        ));

        return InternalNoteResponse.from(saved);
    }

    @Transactional
    public InternalNoteResponse updateInternalNote(Long issueId, Long noteId, UpdateInternalNoteRequest request, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Note content cannot be blank");
        }
        if (request.content().length() > 5000) {
            throw new IllegalArgumentException("Note content cannot exceed 5000 characters");
        }

        InternalNote note = findNoteWithTenantCheck(noteId, issueId, currentUser);

        if (!note.getAuthor().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Only the author can update their internal note");
        }

        note.updateContent(request.content().trim());
        InternalNote saved = internalNoteRepository.save(note);

        auditLogRepository.save(new AuditLog(
                issue,
                "INTERNAL_NOTE_UPDATED",
                currentUser.getUsername() + " (Note ID: " + saved.getId() + ")"
        ));

        return InternalNoteResponse.from(saved);
    }

    @Transactional
    public void deleteInternalNote(Long issueId, Long noteId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        InternalNote note = findNoteWithTenantCheck(noteId, issueId, currentUser);

        if (!note.getAuthor().getId().equals(currentUser.getId())
                && currentUser.getRole() != Role.ADMIN
                && currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("You do not have permission to delete this internal note");
        }

        internalNoteRepository.delete(note);

        auditLogRepository.save(new AuditLog(
                issue,
                "INTERNAL_NOTE_DELETED",
                currentUser.getUsername() + " (Note ID: " + noteId + ")"
        ));
    }

    private Issue getIssueWithTenantCheck(Long issueId, User currentUser) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + issueId));
        if (currentUser.getRole() != Role.SUPER_ADMIN) {
            if (issue.getOrganization() == null || currentUser.getOrganization() == null ||
                    !issue.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
                throw new EntityNotFoundException("Issue not found: " + issueId);
            }
        }
        return issue;
    }

    private void verifyCaseManagementPermission(Issue issue, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.SUPER_ADMIN && currentUser.getRole() != Role.INVESTIGATOR) {
            throw new AccessDeniedException("Ordinary members/students cannot access internal case management features");
        }
    }

    private InternalNote findNoteWithTenantCheck(Long noteId, Long issueId, User currentUser) {
        InternalNote note;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            note = internalNoteRepository.findByIdAndIssueId(noteId, issueId)
                    .orElseThrow(() -> new EntityNotFoundException("Internal note not found: " + noteId));
        } else {
            note = internalNoteRepository.findByIdAndIssueIdAndOrganizationId(
                    noteId, issueId, currentUser.getOrganization().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Internal note not found: " + noteId));
        }
        return note;
    }
}
