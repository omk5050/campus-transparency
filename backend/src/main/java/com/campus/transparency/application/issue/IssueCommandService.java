package com.campus.transparency.application.issue;

import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.campus.transparency.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.domain.notification.NotificationType;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IssueCommandService {

    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public IssueCommandService(
            IssueRepository issueRepository,
            AuditLogRepository auditLogRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService
    ) {
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    
    //---COMMANDS---
    

    @Transactional
    public Issue create(String title, String description, String reporterHash) {
        return create(title, description, reporterHash, "Infrastructure", "Facilities & Operations");
    }

    @Transactional
    public Issue create(String title, String description, String reporterHash, String category, String department) {
        Organization org = null;
        com.campus.transparency.domain.user.User reporter = null;
        try {
            org = currentUserService.getCurrentOrganization();
            reporter = currentUserService.getCurrentUser();
        } catch (Exception e) {
            // In non-web contexts, org and reporter will be null unless passed explicitly
        }
        return create(title, description, reporterHash, category, department, org, reporter);
    }

    @Transactional
    public Issue create(String title, String description, String reporterHash, String category, String department, Organization organization) {
        return create(title, description, reporterHash, category, department, organization, null);
    }

    @Transactional
    public Issue create(String title, String description, String reporterHash, String category, String department, Organization organization, com.campus.transparency.domain.user.User reporter) {
        Issue issue = new Issue(title, description, reporterHash, category, department, organization, null, reporter);
        issue = issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, "ISSUE_CREATED", "system"));
        return issue;
    }

    @Transactional
    public void report(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REPORTED, "STATUS_CHANGED", "admin");
    }

    @Transactional
    public void startProgress(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.IN_PROGRESS, "STATUS_CHANGED", "admin");
    }

    @Transactional
    public void resolve(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.RESOLVED, "ISSUE_RESOLVED", "admin");
    }

    @Transactional
    public void reject(Long issueId) {
        Issue issue = getIssue(issueId);
        transition(issue, IssueStatus.REJECTED, "ISSUE_REJECTED", "admin");
    }

    @Transactional
    public void hide(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.hide();
        issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, "ISSUE_HIDDEN", "admin"));
    }

    @Transactional
    public void unhide(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.unhide();
        issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, "ISSUE_UNHIDDEN", "admin"));
    }

    @Transactional
    public void upvote(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.upvote();
        issueRepository.save(issue);
    }

    @Transactional
    public void downvote(Long issueId) {
        Issue issue = getIssue(issueId);
        issue.downvote();
        issueRepository.save(issue);
    }

    @Transactional
    public void vote(Long issueId, int delta) {
        Issue issue = getIssue(issueId);
        issue.vote(delta);
        issueRepository.save(issue);
    }

    @Transactional
    public Issue assign(Long issueId, Long userId, String department, String adminActor) {
        Issue issue = getIssue(issueId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (user.getRole() != Role.ADMIN && user.getRole() != Role.INVESTIGATOR) {
            throw new IllegalArgumentException("Only administrative staff / investigators can be assigned to issues");
        }

        if (issue.getOrganization() != null && (user.getOrganization() == null || !user.getOrganization().getId().equals(issue.getOrganization().getId()))) {
            throw new IllegalArgumentException("Assignee must belong to the same organization as the issue");
        }

        issue.assignTo(user);
        if (department != null && !department.isBlank()) {
            issue.setDepartment(department);
        }
        issue = issueRepository.save(issue);

        String actor = (adminActor != null && !adminActor.isBlank()) ? adminActor : "admin";
        auditLogRepository.save(new AuditLog(issue, "ISSUE_ASSIGNED", actor + " (assigned to " + user.getUsername() + ")"));

        notificationService.createNotification(
                user,
                issue.getOrganization(),
                NotificationType.ISSUE_ASSIGNED,
                "Case Assigned",
                "You have been assigned to case #" + issue.getId() + ".",
                "ISSUE",
                issue.getId()
        );

        return issue;
    }

    @Transactional
    public Issue unassign(Long issueId, String adminActor) {
        Issue issue = getIssue(issueId);
        User previousAssignee = issue.getAssignedTo();
        issue.unassign();
        issue = issueRepository.save(issue);

        String actor = (adminActor != null && !adminActor.isBlank()) ? adminActor : "admin";
        String details = previousAssignee != null ? " (unassigned from " + previousAssignee.getUsername() + ")" : "";
        auditLogRepository.save(new AuditLog(issue, "ISSUE_UNASSIGNED", actor + details));

        if (previousAssignee != null) {
            notificationService.createNotification(
                    previousAssignee,
                    issue.getOrganization(),
                    NotificationType.ISSUE_UNASSIGNED,
                    "Case Unassigned",
                    "You were unassigned from case #" + issue.getId() + ".",
                    "ISSUE",
                    issue.getId()
            );
        }

        return issue;
    }

    //---INTERNALS---
     

    private Issue getIssue(Long id) {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // Unauthenticated or system fallback
        }
        return getIssue(id, orgId);
    }

    private Issue getIssue(Long id, Long organizationId) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + id));
        if (organizationId != null && (issue.getOrganization() == null || !issue.getOrganization().getId().equals(organizationId))) {
            throw new EntityNotFoundException("Issue not found: " + id);
        }
        return issue;
    }

    private void transition(Issue issue, IssueStatus targetStatus, String action, String actor) {
        issue.transitionTo(targetStatus);   // ✅ DOMAIN ENFORCES RULES
        issueRepository.save(issue);
        auditLogRepository.save(new AuditLog(issue, action, actor));

        if (issue.getAssignedTo() != null) {
            NotificationType notifType;
            String title;
            String message;
            if (targetStatus == IssueStatus.RESOLVED) {
                notifType = NotificationType.ISSUE_RESOLVED;
                title = "Case Resolved";
                message = "Case #" + issue.getId() + " has been marked as resolved.";
            } else if (targetStatus == IssueStatus.REJECTED) {
                notifType = NotificationType.ISSUE_REJECTED;
                title = "Case Rejected";
                message = "Case #" + issue.getId() + " has been rejected.";
            } else {
                notifType = NotificationType.ISSUE_STATUS_CHANGED;
                title = "Case Status Updated";
                message = "Status of case #" + issue.getId() + " changed to " + targetStatus + ".";
            }
            notificationService.createNotification(
                    issue.getAssignedTo(),
                    issue.getOrganization(),
                    notifType,
                    title,
                    message,
                    "ISSUE",
                    issue.getId()
            );
        }
    }
}

