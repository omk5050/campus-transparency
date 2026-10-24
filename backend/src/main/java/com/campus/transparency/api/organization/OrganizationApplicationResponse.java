package com.campus.transparency.api.organization;

import com.campus.transparency.domain.organization.ApplicationStatus;
import com.campus.transparency.domain.organization.OrganizationApplication;
import com.campus.transparency.domain.organization.OrganizationType;

import java.time.Instant;

public record OrganizationApplicationResponse(
        Long id,
        String organizationName,
        OrganizationType organizationType,
        String officialEmail,
        String contactPerson,
        String address,
        String website,
        String description,
        String requestedAdminEmail,
        String requestedAdminUsername,
        ApplicationStatus status,
        String rejectionReason,
        String reviewedBy,
        Instant reviewedAt,
        Long approvedOrganizationId,
        Instant createdAt,
        Instant updatedAt
) {
    public static OrganizationApplicationResponse from(OrganizationApplication app) {
        Long approvedOrgId = (app.getApprovedOrganization() != null) ? app.getApprovedOrganization().getId() : null;
        return new OrganizationApplicationResponse(
                app.getId(),
                app.getOrganizationName(),
                app.getOrganizationType(),
                app.getOfficialEmail(),
                app.getContactPerson(),
                app.getAddress(),
                app.getWebsite(),
                app.getDescription(),
                app.getRequestedAdminEmail(),
                app.getRequestedAdminUsername(),
                app.getStatus(),
                app.getRejectionReason(),
                app.getReviewedBy(),
                app.getReviewedAt(),
                approvedOrgId,
                app.getCreatedAt(),
                app.getUpdatedAt()
        );
    }
}
