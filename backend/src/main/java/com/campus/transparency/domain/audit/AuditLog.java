package com.campus.transparency.domain.audit;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.issue.Issue;
import jakarta.persistence.*;

@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 100)
    private String actor;

    protected AuditLog() {}

    public AuditLog(Issue issue, String action, String actor) {
        this.issue = issue;
        this.action = action;
        this.actor = actor;
    }

    public Issue getIssue() { return issue; }
    public String getAction() { return action; }
    public String getActor() { return actor; }
}
