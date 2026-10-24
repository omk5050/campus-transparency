package com.campus.transparency.domain.organization;

import com.campus.transparency.domain.base.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "organizations")
public class Organization extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "organization_type", nullable = false, length = 50)
    private OrganizationType organizationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OrganizationStatus status;

    @Column(name = "official_email", length = 255)
    private String officialEmail;

    protected Organization() {
        // JPA only
    }

    public Organization(String name, OrganizationType organizationType, OrganizationStatus status, String officialEmail) {
        this.name = name;
        this.organizationType = organizationType;
        this.status = status;
        this.officialEmail = officialEmail;
    }

    public Organization(String name, OrganizationType organizationType) {
        this(name, organizationType, OrganizationStatus.ACTIVE, null);
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public OrganizationType getOrganizationType() {
        return organizationType;
    }

    public void setOrganizationType(OrganizationType organizationType) {
        this.organizationType = organizationType;
    }

    public OrganizationStatus getStatus() {
        return status;
    }

    public void setStatus(OrganizationStatus status) {
        this.status = status;
    }

    public String getOfficialEmail() {
        return officialEmail;
    }

    public void setOfficialEmail(String officialEmail) {
        this.officialEmail = officialEmail;
    }
}
