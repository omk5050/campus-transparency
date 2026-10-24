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
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class IssueQueryService {

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public IssueQueryService(
            IssueRepository issueRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService
    ) {
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
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
        if (organizationId == null) {
            return userRepository.findByRole(Role.ADMIN).stream()
                    .map(AssignedUserResponse::from)
                    .toList();
        }
        return userRepository.findByRoleAndOrganizationId(Role.ADMIN, organizationId).stream()
                .map(AssignedUserResponse::from)
                .toList();
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
        return issue;
    }

    @Transactional(readOnly = true)
    public Issue getByTrackingCode(String trackingCode) {
        return issueRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Issue not found with tracking code: " + trackingCode));
    }
}
