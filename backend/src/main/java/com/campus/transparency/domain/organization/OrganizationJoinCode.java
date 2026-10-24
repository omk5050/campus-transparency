package com.campus.transparency.domain.organization;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.user.Role;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "organization_join_codes")
public class OrganizationJoinCode extends BaseEntity {

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 20)
    private Role targetRole;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "used_count", nullable = false)
    private int usedCount = 0;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean revoked = false;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by", length = 100)
    private String revokedBy;

    protected OrganizationJoinCode() {}

    public OrganizationJoinCode(
            String code,
            Organization organization,
            Role targetRole,
            String createdBy,
            Integer maxUses,
            Instant expiresAt
    ) {
        this.code = code;
        this.organization = organization;
        this.targetRole = targetRole;
        this.createdBy = createdBy;
        this.maxUses = maxUses;
        this.expiresAt = expiresAt;
        this.usedCount = 0;
        this.revoked = false;
    }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isExhausted() {
        return maxUses != null && usedCount >= maxUses;
    }

    public boolean isValid() {
        return !revoked && !isExpired() && !isExhausted() &&
                organization != null && organization.getStatus() == OrganizationStatus.ACTIVE;
    }

    public void recordUsage() {
        if (!isValid()) {
            throw new IllegalStateException("Join code is invalid, expired, revoked, or exhausted");
        }
        this.usedCount++;
    }

    public void revoke(String revokedByUsername) {
        this.revoked = true;
        this.revokedAt = Instant.now();
        this.revokedBy = revokedByUsername;
    }

    public String getCode() { return code; }
    public Organization getOrganization() { return organization; }
    public Role getTargetRole() { return targetRole; }
    public String getCreatedBy() { return createdBy; }
    public Integer getMaxUses() { return maxUses; }
    public int getUsedCount() { return usedCount; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isRevoked() { return revoked; }
    public Instant getRevokedAt() { return revokedAt; }
    public String getRevokedBy() { return revokedBy; }
}
