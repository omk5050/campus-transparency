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

    protected AuditLog() {}

    public AuditLog(String action, String actor) {
        this.action = action;
        this.actor = actor;
    }
}
