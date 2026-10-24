package com.campus.transparency.domain.organization;

import com.campus.transparency.domain.base.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "organization_application_audit_logs")
public class OrganizationApplicationAuditLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private OrganizationApplication application;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(length = 2000)
    private String details;

    protected OrganizationApplicationAuditLog() {}

    public OrganizationApplicationAuditLog(OrganizationApplication application, String action, String performedBy, String details) {
        this.application = application;
        this.action = action;
        this.performedBy = performedBy;
        this.details = details;
    }

    public OrganizationApplication getApplication() { return application; }
    public String getAction() { return action; }
    public String getPerformedBy() { return performedBy; }
    public String getDetails() { return details; }
}
