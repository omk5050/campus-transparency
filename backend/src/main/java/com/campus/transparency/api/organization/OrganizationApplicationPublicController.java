package com.campus.transparency.api.organization;

import com.campus.transparency.application.organization.OrganizationApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organization-applications")
public class OrganizationApplicationPublicController {

    private final OrganizationApplicationService applicationService;

    public OrganizationApplicationPublicController(OrganizationApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationApplicationResponse submitApplication(
            @Valid @RequestBody CreateOrganizationApplicationRequest request
    ) {
        return applicationService.submitApplication(request);
    }
}
