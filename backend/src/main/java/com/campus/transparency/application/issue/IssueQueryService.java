package com.campus.transparency.application.issue;

import com.campus.transparency.api.issue.AssignedUserResponse;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueSpecification;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.UserRepository;
import com.campus.transparency.security.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.campus.transparency.api.issue.OrganizationMetricsResponse;
import com.campus.transparency.api.issue.PlatformMetricsResponse;
import com.campus.transparency.domain.organization.ApplicationStatus;
import com.campus.transparency.domain.organization.OrganizationApplicationRepository;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.user.User;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IssueQueryService {

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationApplicationRepository organizationApplicationRepository;
    private final CurrentUserService currentUserService;

    public IssueQueryService(
            IssueRepository issueRepository,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationApplicationRepository organizationApplicationRepository,
            CurrentUserService currentUserService
    ) {
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.organizationApplicationRepository = organizationApplicationRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public Page<Issue> getPublicIssues(IssueStatus status, Instant startDate, Instant endDate, Pageable pageable) {
        return getPublicIssues(status, null, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getPublicIssues(IssueStatus status, String department, Instant startDate, Instant endDate, Pageable pageable) {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // Fallback for non-authenticated contexts
        }
        return getPublicIssues(orgId, status, department, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getPublicIssues(Long organizationId, IssueStatus status, String department, Instant startDate, Instant endDate, Pageable pageable) {
        Specification<Issue> spec = Specification.where(IssueSpecification.belongsToOrganization(organizationId))
                .and(IssueSpecification.isNotHidden())
                .and(IssueSpecification.hasStatus(status))
                .and(IssueSpecification.hasDepartment(department))
                .and(IssueSpecification.createdAfter(startDate))
                .and(IssueSpecification.createdBefore(endDate));
        return issueRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getAllIssuesForAdmin(IssueStatus status, Instant startDate, Instant endDate, Pageable pageable) {
        return getAllIssuesForAdmin(status, null, null, null, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getAllIssuesForAdmin(
            IssueStatus status,
            String department,
            Long assignedTo,
            Boolean unassigned,
            Instant startDate,
            Instant endDate,
            Pageable pageable
    ) {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // Fallback for non-authenticated contexts
        }
        return getAllIssuesForAdmin(orgId, status, department, assignedTo, unassigned, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getAllIssuesForAdmin(
            Long organizationId,
            IssueStatus status,
            String department,
            Long assignedTo,
            Boolean unassigned,
            Instant startDate,
            Instant endDate,
            Pageable pageable
    ) {
        Specification<Issue> spec = Specification.where(IssueSpecification.belongsToOrganization(organizationId))
                .and(IssueSpecification.hasStatus(status))
                .and(IssueSpecification.hasDepartment(department))
                .and(IssueSpecification.createdAfter(startDate))
                .and(IssueSpecification.createdBefore(endDate));

        if (Boolean.TRUE.equals(unassigned)) {
            spec = spec.and(IssueSpecification.isUnassigned());
        } else if (assignedTo != null) {
            spec = spec.and(IssueSpecification.assignedToUser(assignedTo));
        }

        return issueRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public List<AssignedUserResponse> getAssignableUsers() {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // Fallback
        }
        return getAssignableUsers(orgId);
    }

    @Transactional(readOnly = true)
    public List<AssignedUserResponse> getAssignableUsers(Long organizationId) {
        List<Role> assignableRoles = List.of(Role.ADMIN, Role.INVESTIGATOR);
        if (organizationId == null) {
            return userRepository.findByRoleIn(assignableRoles).stream()
                    .map(AssignedUserResponse::from)
                    .toList();
        }
        return userRepository.findByRoleInAndOrganizationId(assignableRoles, organizationId).stream()
                .map(AssignedUserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<Issue> getMyComplaints(Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();
        Long orgId = currentUser.getOrganization() != null ? currentUser.getOrganization().getId() : null;
        Specification<Issue> spec = Specification.where(IssueSpecification.belongsToOrganization(orgId))
                .and(IssueSpecification.reportedByUser(currentUser.getId()));
        return issueRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Issue> getAssignedComplaints(Pageable pageable) {
        User currentUser = currentUserService.getCurrentUser();
        Long orgId = currentUser.getOrganization() != null ? currentUser.getOrganization().getId() : null;
        Specification<Issue> spec = Specification.where(IssueSpecification.belongsToOrganization(orgId))
                .and(IssueSpecification.assignedToUser(currentUser.getId()));
        return issueRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Issue getById(Long id) {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // Fallback
        }
        return getById(id, orgId);
    }

    @Transactional(readOnly = true)
    public Issue getById(Long id, Long organizationId) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Issue not found with id: " + id));
        if (organizationId != null && (issue.getOrganization() == null || !issue.getOrganization().getId().equals(organizationId))) {
            throw new jakarta.persistence.EntityNotFoundException("Issue not found with id: " + id);
        }
        try {
            User currentUser = currentUserService.getCurrentUser();
            if (currentUser != null && currentUser.getRole() == Role.STUDENT) {
                if (issue.getReporter() == null || !issue.getReporter().getId().equals(currentUser.getId())) {
                    throw new jakarta.persistence.EntityNotFoundException("Issue not found with id: " + id);
                }
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            throw e;
        } catch (Exception ignored) {
        }
        return issue;
    }

    @Transactional(readOnly = true)
    public OrganizationMetricsResponse getOrganizationMetrics() {
        Long orgId = currentUserService.getCurrentOrganizationId();
        long total = issueRepository.countByOrganizationId(orgId);
        long reported = issueRepository.countByOrganizationIdAndStatus(orgId, IssueStatus.REPORTED);
        long inProgress = issueRepository.countByOrganizationIdAndStatus(orgId, IssueStatus.IN_PROGRESS);
        long resolved = issueRepository.countByOrganizationIdAndStatus(orgId, IssueStatus.RESOLVED);
        long rejected = issueRepository.countByOrganizationIdAndStatus(orgId, IssueStatus.REJECTED);
        long assigned = issueRepository.countByOrganizationIdAndAssignedToIsNotNull(orgId);
        long unassigned = issueRepository.countByOrganizationIdAndAssignedToIsNull(orgId);
        return new OrganizationMetricsResponse(total, reported, inProgress, resolved, rejected, assigned, unassigned);
    }

    @Transactional(readOnly = true)
    public PlatformMetricsResponse getPlatformMetrics() {
        long totalOrgs = organizationRepository.count();
        long activeOrgs = organizationRepository.countByStatus(OrganizationStatus.ACTIVE);
        long suspendedOrgs = organizationRepository.countByStatus(OrganizationStatus.SUSPENDED);
        long pendingApps = organizationApplicationRepository.countByStatus(ApplicationStatus.PENDING);
        long totalComplaints = issueRepository.count();
        return new PlatformMetricsResponse(totalOrgs, activeOrgs, suspendedOrgs, pendingApps, totalComplaints);
    }

    @Transactional(readOnly = true)
    public Issue getByTrackingCode(String trackingCode) {
        return issueRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Issue not found with tracking code: " + trackingCode));
    }
}
