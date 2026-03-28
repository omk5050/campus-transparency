package com.campus.transparency.domain.issue;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.lifecycle.IssueLifecyclePolicy;
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

    protected Issue() {
        // JPA only
    }

    public Issue(String title, String description, String reporterHash) {
        this.title = title;
        this.description = description;
        this.reporterHash = reporterHash;
        this.status = IssueStatus.REPORTED;
    }

    /* =========================
       DOMAIN-ENFORCED LIFECYCLE
       ========================= */

    public void transitionTo(IssueStatus next) {
        if (!IssueLifecyclePolicy.canTransition(this.status, next)) {
            throw new IllegalStateException(
                    "Invalid issue status transition: " + this.status + " → " + next
            );
        }
        this.status = next;
    }

    /* =========================
       VISIBILITY CONTROL
       ========================= */

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

    /* =========================
       READ-ONLY ACCESS
       ========================= */

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
}
