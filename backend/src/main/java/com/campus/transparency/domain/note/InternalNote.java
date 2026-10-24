package com.campus.transparency.domain.note;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "issue_internal_notes")
public class InternalNote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 5000)
    private String content;

    protected InternalNote() {}

    public InternalNote(Issue issue, User author, Organization organization, String content) {
        this.issue = issue;
        this.author = author;
        this.organization = organization;
        this.content = content;
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }

    public Issue getIssue() { return issue; }
    public User getAuthor() { return author; }
    public Organization getOrganization() { return organization; }
    public String getContent() { return content; }
}
