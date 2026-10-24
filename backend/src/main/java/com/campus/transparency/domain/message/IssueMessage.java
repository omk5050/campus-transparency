package com.campus.transparency.domain.message;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "issue_messages")
public class IssueMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 5000)
    private String content;

    protected IssueMessage() {}

    public IssueMessage(Issue issue, User sender, Organization organization, String content) {
        this.issue = issue;
        this.sender = sender;
        this.organization = organization;
        this.content = content;
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }

    public Issue getIssue() { return issue; }
    public User getSender() { return sender; }
    public Organization getOrganization() { return organization; }
    public String getContent() { return content; }
}
