package com.campus.transparency.domain.user;

import com.campus.transparency.domain.base.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id")
    private com.campus.transparency.domain.organization.Organization organization;

    protected User() {}

    public User(String username, String passwordHash, Role role) {
        this(username, passwordHash, role, null);
    }

    public User(String username, String passwordHash, Role role, com.campus.transparency.domain.organization.Organization organization) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.organization = organization;
    }

    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public com.campus.transparency.domain.organization.Organization getOrganization() { return organization; }
    public void setOrganization(com.campus.transparency.domain.organization.Organization organization) { this.organization = organization; }
}
