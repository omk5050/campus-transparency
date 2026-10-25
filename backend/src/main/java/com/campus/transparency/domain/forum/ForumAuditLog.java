package com.campus.transparency.domain.forum;

import com.campus.transparency.domain.organization.Organization;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "forum_audit_logs")
public class ForumAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 100)
    private String actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private ForumAuditAction action;

    @Column(name = "target_type", nullable = false, length = 32)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ForumAuditLog() {
        // JPA only
    }

    public ForumAuditLog(
            Organization organization,
            String actor,
            ForumAuditAction action,
            String targetType,
            Long targetId,
            String reason
    ) {
        this.organization = organization;
        this.actor = actor;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Organization getOrganization() {
        return organization;
    }

    public String getActor() {
        return actor;
    }

    public ForumAuditAction getAction() {
        return action;
    }

    public String getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public String getReason() {
        return reason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
