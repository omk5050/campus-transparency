package com.campus.transparency.application.message;

import com.campus.transparency.api.message.CreateIssueMessageRequest;
import com.campus.transparency.api.message.IssueMessageResponse;
import com.campus.transparency.api.message.UpdateIssueMessageRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.message.IssueMessage;
import com.campus.transparency.domain.message.IssueMessageRepository;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.domain.notification.NotificationType;

@Service
public class IssueMessageService {

    private final IssueMessageRepository messageRepository;
    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;

    public IssueMessageService(
            IssueMessageRepository messageRepository,
            IssueRepository issueRepository,
            AuditLogRepository auditLogRepository,
            NotificationService notificationService
    ) {
        this.messageRepository = messageRepository;
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<IssueMessageResponse> getMessages(Long issueId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        List<IssueMessage> messages;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            messages = messageRepository.findByIssueIdOrderByCreatedAtAsc(issueId);
        } else {
            messages = messageRepository.findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(
                    issueId, currentUser.getOrganization().getId());
        }

        return messages.stream().map(IssueMessageResponse::from).toList();
    }

    @Transactional
    public IssueMessageResponse createMessage(Long issueId, CreateIssueMessageRequest request, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be blank");
        }
        if (request.content().length() > 5000) {
            throw new IllegalArgumentException("Message content cannot exceed 5000 characters");
        }

        IssueMessage message = new IssueMessage(
                issue,
                currentUser,
                issue.getOrganization(),
                request.content().trim()
        );

        IssueMessage saved = messageRepository.save(message);

        auditLogRepository.save(new AuditLog(
                issue,
                "ISSUE_MESSAGE_SENT",
                currentUser.getUsername() + " (Message ID: " + saved.getId() + ")"
        ));

        if (issue.getAssignedTo() != null && !issue.getAssignedTo().getId().equals(currentUser.getId())) {
            notificationService.createNotification(
                    issue.getAssignedTo(),
                    issue.getOrganization(),
                    NotificationType.INTERNAL_MESSAGE_RECEIVED,
                    "New Case Message",
                    "A new internal message was sent on case #" + issue.getId() + ".",
                    "ISSUE",
                    issue.getId()
            );
        }

        return IssueMessageResponse.from(saved);
    }

    @Transactional
    public IssueMessageResponse updateMessage(Long issueId, Long messageId, UpdateIssueMessageRequest request, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be blank");
        }
        if (request.content().length() > 5000) {
            throw new IllegalArgumentException("Message content cannot exceed 5000 characters");
        }

        IssueMessage message = findMessageWithTenantCheck(messageId, issueId, currentUser);

        if (!message.getSender().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Only the sender can update their message");
        }

        message.updateContent(request.content().trim());
        IssueMessage saved = messageRepository.save(message);

        auditLogRepository.save(new AuditLog(
                issue,
                "ISSUE_MESSAGE_UPDATED",
                currentUser.getUsername() + " (Message ID: " + saved.getId() + ")"
        ));

        return IssueMessageResponse.from(saved);
    }

    @Transactional
    public void deleteMessage(Long issueId, Long messageId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyCaseManagementPermission(issue, currentUser);

        IssueMessage message = findMessageWithTenantCheck(messageId, issueId, currentUser);

        if (!message.getSender().getId().equals(currentUser.getId())
                && currentUser.getRole() != Role.ADMIN
                && currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("You do not have permission to delete this message");
        }

        messageRepository.delete(message);

        auditLogRepository.save(new AuditLog(
                issue,
                "ISSUE_MESSAGE_DELETED",
                currentUser.getUsername() + " (Message ID: " + messageId + ")"
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

    private IssueMessage findMessageWithTenantCheck(Long messageId, Long issueId, User currentUser) {
        IssueMessage message;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            message = messageRepository.findByIdAndIssueId(messageId, issueId)
                    .orElseThrow(() -> new EntityNotFoundException("Message not found: " + messageId));
        } else {
            message = messageRepository.findByIdAndIssueIdAndOrganizationId(
                    messageId, issueId, currentUser.getOrganization().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Message not found: " + messageId));
        }
        return message;
    }
}
