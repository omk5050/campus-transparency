package com.campus.transparency.application.organization;

import com.campus.transparency.api.organization.CreateOrganizationApplicationRequest;
import com.campus.transparency.api.organization.OrganizationApplicationResponse;
import com.campus.transparency.domain.organization.*;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.domain.notification.NotificationType;

@Service
public class OrganizationApplicationService {

    private final OrganizationApplicationRepository applicationRepository;
    private final OrganizationApplicationAuditLogRepository auditLogRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public OrganizationApplicationService(
            OrganizationApplicationRepository applicationRepository,
            OrganizationApplicationAuditLogRepository auditLogRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            NotificationService notificationService
    ) {
        this.applicationRepository = applicationRepository;
        this.auditLogRepository = auditLogRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    @Transactional
    public OrganizationApplicationResponse submitApplication(CreateOrganizationApplicationRequest request) {
        if (organizationRepository.existsByNameIgnoreCase(request.organizationName())) {
            throw new IllegalArgumentException("An active organization with this name already exists");
        }
        if (organizationRepository.existsByOfficialEmailIgnoreCase(request.officialEmail())) {
            throw new IllegalArgumentException("An active organization with this official email already exists");
        }
        if (userRepository.existsByUsernameIgnoreCase(request.requestedAdminUsername())) {
            throw new IllegalArgumentException("Requested administrator username is already taken");
        }
        if (applicationRepository.existsByOrganizationNameIgnoreCaseAndStatus(request.organizationName(), ApplicationStatus.PENDING)) {
            throw new IllegalArgumentException("A pending application for this organization name already exists");
        }
        if (applicationRepository.existsByOfficialEmailIgnoreCaseAndStatus(request.officialEmail(), ApplicationStatus.PENDING)) {
            throw new IllegalArgumentException("A pending application for this official email already exists");
        }
        if (applicationRepository.existsByRequestedAdminUsernameIgnoreCaseAndStatus(request.requestedAdminUsername(), ApplicationStatus.PENDING)) {
            throw new IllegalArgumentException("A pending application with this requested administrator username already exists");
        }

        String passwordHash = passwordEncoder.encode(request.requestedAdminPassword());

        OrganizationApplication application = new OrganizationApplication(
                request.organizationName().trim(),
                request.organizationType(),
                request.officialEmail().trim(),
                request.contactPerson().trim(),
                request.address().trim(),
                request.website() != null ? request.website().trim() : null,
                request.description().trim(),
                request.requestedAdminEmail().trim(),
                request.requestedAdminUsername().trim(),
                passwordHash
        );

        OrganizationApplication saved = applicationRepository.save(application);

        auditLogRepository.save(new OrganizationApplicationAuditLog(
                saved,
                "APPLICATION_SUBMITTED",
                request.requestedAdminEmail().trim(),
                "Submitted application for: " + saved.getOrganizationName() + " (" + saved.getOrganizationType() + ")"
        ));

        return OrganizationApplicationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<OrganizationApplicationResponse> getApplications(ApplicationStatus status, Pageable pageable) {
        if (status != null) {
            return applicationRepository.findByStatus(status, pageable)
                    .map(OrganizationApplicationResponse::from);
        }
        return applicationRepository.findAll(pageable)
                .map(OrganizationApplicationResponse::from);
    }

    @Transactional(readOnly = true)
    public OrganizationApplicationResponse getApplicationById(Long id) {
        OrganizationApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization application not found: " + id));
        return OrganizationApplicationResponse.from(application);
    }

    @Transactional
    public OrganizationApplicationResponse approveApplication(Long id, String superAdminUsername) {
        OrganizationApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization application not found: " + id));

        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Cannot approve organization application in status: " + application.getStatus());
        }

        if (userRepository.existsByUsernameIgnoreCase(application.getRequestedAdminUsername())) {
            throw new IllegalStateException("Username is already in use by an existing user: " + application.getRequestedAdminUsername());
        }

        // 1. Create Organization
        Organization newOrg = new Organization(
                application.getOrganizationName(),
                application.getOrganizationType(),
                OrganizationStatus.ACTIVE,
                application.getOfficialEmail()
        );
        Organization savedOrg = organizationRepository.save(newOrg);

        // 2. Create requested Organization Admin user
        User adminUser = new User(
                application.getRequestedAdminUsername(),
                application.getRequestedAdminPasswordHash(),
                Role.ADMIN,
                savedOrg
        );
        userRepository.save(adminUser);

        // 3. Mark application APPROVED
        application.approve(superAdminUsername, savedOrg);
        OrganizationApplication updatedApp = applicationRepository.save(application);

        // 4. Audit Log
        auditLogRepository.save(new OrganizationApplicationAuditLog(
                updatedApp,
                "APPLICATION_APPROVED",
                superAdminUsername,
                "Approved organization: " + savedOrg.getName() + " (ID: " + savedOrg.getId() + ") with admin user: " + adminUser.getUsername()
        ));

        // 5. In-App Notification to new Organization Admin
        notificationService.createNotification(
                adminUser,
                savedOrg,
                NotificationType.ORGANIZATION_APPLICATION_APPROVED,
                "Organization Approved",
                "Your organization application for " + savedOrg.getName() + " has been approved.",
                "ORGANIZATION_APPLICATION",
                updatedApp.getId()
        );

        return OrganizationApplicationResponse.from(updatedApp);
    }

    @Transactional
    public OrganizationApplicationResponse rejectApplication(Long id, String reason, String superAdminUsername) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason cannot be blank");
        }

        OrganizationApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organization application not found: " + id));

        if (application.getStatus() == ApplicationStatus.APPROVED) {
            throw new IllegalStateException("Cannot reject an already approved application");
        }
        if (application.getStatus() == ApplicationStatus.REJECTED) {
            throw new IllegalStateException("Application is already rejected");
        }

        application.reject(superAdminUsername, reason.trim());
        OrganizationApplication updatedApp = applicationRepository.save(application);

        auditLogRepository.save(new OrganizationApplicationAuditLog(
                updatedApp,
                "APPLICATION_REJECTED",
                superAdminUsername,
                "Reason: " + reason.trim()
        ));

        return OrganizationApplicationResponse.from(updatedApp);
    }
}
