package com.campus.transparency.domain.issue;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.lifecycle.IssueLifecyclePolicy;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "issues")
public class Issue extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 5000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IssueStatus status;

    // Controlled anonymity: opaque identifier, never exposed
    @Column(nullable = false, updatable = false, length = 64)
    private String reporterHash;

    // Moderation visibility
    @Column(nullable = false)
    private boolean hidden = false;

    @Column(nullable = false)
    private int voteCount = 1;

    @Column(length = 32)
    private String trackingCode;

    @Column(length = 50)
    private String category;

    @Column(length = 50)
    private String department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private com.campus.transparency.domain.organization.Organization organization;

    protected Issue() {
        // JPA only
    }

    public Issue(String title, String description, String reporterHash) {
        this(title, description, reporterHash, "Infrastructure", "Facilities & Operations", null);
    }

    public Issue(String title, String description, String reporterHash, String category, String department) {
        this(title, description, reporterHash, category, department, null);
    }

    public Issue(String title, String description, String reporterHash, String category, String department, com.campus.transparency.domain.organization.Organization organization) {
        this.title = title;
        this.description = description;
        this.reporterHash = reporterHash;
        this.status = IssueStatus.REPORTED;
        this.category = (category != null && !category.isBlank()) ? category : "Infrastructure";
        this.department = (department != null && !department.isBlank()) ? department : "Facilities & Operations";
        this.trackingCode = "CMP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        this.organization = organization;
    }

    //---DOMAIN-ENFORCED LIFECYCLE---

    public void transitionTo(IssueStatus next) {
        if (!IssueLifecyclePolicy.canTransition(this.status, next)) {
            throw new IllegalStateException(
                    "Invalid issue status transition: " + this.status + " → " + next
            );
        }
        this.status = next;
    }


    //---VISIBILITY CONTROL---

    public void hide() {
        this.hidden = true;
    }

    public void unhide() {
        this.hidden = false;
    }

    public void upvote() {
        this.voteCount++;
    }

    public void downvote() {
        this.voteCount--;
    }

    public void vote(int delta) {
        this.voteCount += delta;
    }

    //---READ-ONLY ACCESS---

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public IssueStatus getStatus() {
        return status;
    }

    public boolean isHidden() {
        return hidden;
    }

    public int getVoteCount() {
        return voteCount;
    }

    public String getReporterHash() {
        return reporterHash;
    }

    public String getTrackingCode() {
        return trackingCode;
    }

    public String getCategory() {
        return category;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        if (department != null && !department.isBlank()) {
            this.department = department;
        }
    }

    public void assignTo(User user) {
        this.assignedTo = user;
    }

    public void unassign() {
        this.assignedTo = null;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public com.campus.transparency.domain.organization.Organization getOrganization() {
        return organization;
    }

    public void setOrganization(com.campus.transparency.domain.organization.Organization organization) {
        this.organization = organization;
    }
}
