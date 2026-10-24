package com.campus.transparency.api.organization;

import com.campus.transparency.application.organization.OrganizationApplicationService;
import com.campus.transparency.domain.organization.ApplicationStatus;
import com.campus.transparency.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/organization-applications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class OrganizationApplicationAdminController {

    private final OrganizationApplicationService applicationService;
    private final CurrentUserService currentUserService;

    public OrganizationApplicationAdminController(
            OrganizationApplicationService applicationService,
            CurrentUserService currentUserService
    ) {
        this.applicationService = applicationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public Page<OrganizationApplicationResponse> listApplications(
            @RequestParam(required = false) ApplicationStatus status,
            Pageable pageable
    ) {
        return applicationService.getApplications(status, pageable);
    }

    @GetMapping("/{id}")
    public OrganizationApplicationResponse getApplication(@PathVariable Long id) {
        return applicationService.getApplicationById(id);
    }

    @PostMapping("/{id}/approve")
    public OrganizationApplicationResponse approveApplication(@PathVariable Long id) {
        String superAdminUsername = currentUserService.getCurrentUser().getUsername();
        return applicationService.approveApplication(id, superAdminUsername);
    }

    @PostMapping("/{id}/reject")
    public OrganizationApplicationResponse rejectApplication(
            @PathVariable Long id,
            @Valid @RequestBody RejectOrganizationApplicationRequest request
    ) {
        String superAdminUsername = currentUserService.getCurrentUser().getUsername();
        return applicationService.rejectApplication(id, request.reason(), superAdminUsername);
    }
}
