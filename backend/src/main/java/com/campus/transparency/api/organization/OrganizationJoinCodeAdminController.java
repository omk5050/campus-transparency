package com.campus.transparency.api.organization;

import com.campus.transparency.application.organization.OrganizationJoinCodeService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/join-codes")
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
public class OrganizationJoinCodeAdminController {

    private final OrganizationJoinCodeService joinCodeService;
    private final CurrentUserService currentUserService;

    public OrganizationJoinCodeAdminController(
            OrganizationJoinCodeService joinCodeService,
            CurrentUserService currentUserService
    ) {
        this.joinCodeService = joinCodeService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public JoinCodeResponse createJoinCode(@Valid @RequestBody CreateJoinCodeRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        return joinCodeService.createJoinCode(request, currentUser);
    }

    @GetMapping
    public Page<JoinCodeResponse> listJoinCodes(
            @RequestParam(required = false) Long organizationId,
            Pageable pageable
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return joinCodeService.getJoinCodes(currentUser, organizationId, pageable);
    }

    @PostMapping("/{id}/revoke")
    public JoinCodeResponse revokeJoinCode(@PathVariable Long id) {
        User currentUser = currentUserService.getCurrentUser();
        return joinCodeService.revokeJoinCode(id, currentUser);
    }
}
