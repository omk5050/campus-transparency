package com.campus.transparency.domain.organization;

import com.campus.transparency.domain.base.BaseEntity;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "organization_applications")
public class OrganizationApplication extends BaseEntity {

    @Column(name = "organization_name", nullable = false, length = 200)
    private String organizationName;

    @Enumerated(EnumType.STRING)
    @Column(name = "organization_type", nullable = false, length = 50)
    private OrganizationType organizationType;

    @Column(name = "official_email", nullable = false, length = 255)
    private String officialEmail;

    @Column(name = "contact_person", nullable = false, length = 100)
    private String contactPerson;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(length = 255)
    private String website;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(name = "requested_admin_email", nullable = false, length = 255)
    private String requestedAdminEmail;

    @Column(name = "requested_admin_username", nullable = false, length = 100)
    private String requestedAdminUsername;

    @Column(name = "requested_admin_password_hash", nullable = false, length = 255)
    private String requestedAdminPasswordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ApplicationStatus status;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_organization_id")
    private Organization approvedOrganization;

    protected OrganizationApplication() {}

    public OrganizationApplication(
            String organizationName,
            OrganizationType organizationType,
            String officialEmail,
            String contactPerson,
            String address,
            String website,
            String description,
            String requestedAdminEmail,
            String requestedAdminUsername,
            String requestedAdminPasswordHash
    ) {
        this.organizationName = organizationName;
        this.organizationType = organizationType;
        this.officialEmail = officialEmail;
        this.contactPerson = contactPerson;
        this.address = address;
        this.website = website;
        this.description = description;
        this.requestedAdminEmail = requestedAdminEmail;
        this.requestedAdminUsername = requestedAdminUsername;
        this.requestedAdminPasswordHash = requestedAdminPasswordHash;
        this.status = ApplicationStatus.PENDING;
    }

    public String getOrganizationName() { return organizationName; }
    public OrganizationType getOrganizationType() { return organizationType; }
    public String getOfficialEmail() { return officialEmail; }
    public String getContactPerson() { return contactPerson; }
    public String getAddress() { return address; }
    public String getWebsite() { return website; }
    public String getDescription() { return description; }
    public String getRequestedAdminEmail() { return requestedAdminEmail; }
    public String getRequestedAdminUsername() { return requestedAdminUsername; }
    public String getRequestedAdminPasswordHash() { return requestedAdminPasswordHash; }
    public ApplicationStatus getStatus() { return status; }
    public String getRejectionReason() { return rejectionReason; }
    public String getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Organization getApprovedOrganization() { return approvedOrganization; }

    public void approve(String reviewerUsername, Organization organization) {
        this.status = ApplicationStatus.APPROVED;
        this.reviewedBy = reviewerUsername;
        this.reviewedAt = Instant.now();
        this.approvedOrganization = organization;
    }

    public void reject(String reviewerUsername, String reason) {
        this.status = ApplicationStatus.REJECTED;
        this.reviewedBy = reviewerUsername;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
    }
}
