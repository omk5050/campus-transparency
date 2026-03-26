package com.campus.transparency.domain.audit;

import com.campus.transparency.domain.base.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 100)
    private String actor;

    @Column(nullable = false)
    private Long issueId;

    protected AuditLog() {}

    public AuditLog(String action, String actor, Long issueId) {
        this.action = action;
        this.actor = actor;
        this.issueId = issueId;
    }

    // Getters (IMPORTANT for Hibernate / future use)

    public String getAction() {
        return action;
    }

    public String getActor() {
        return actor;
    }

    public Long getIssueId() {
        return issueId;
    }
}