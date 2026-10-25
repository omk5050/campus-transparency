package com.campus.transparency.domain.forum;

import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "forum_replies")
public class ForumReply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private ForumPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "author_alias", nullable = false, length = 64)
    private String authorAlias;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ForumReplyStatus status = ForumReplyStatus.PUBLISHED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @Column(name = "moderated_by", length = 100)
    private String moderatedBy;

    @Column(name = "moderation_reason", length = 500)
    private String moderationReason;

    protected ForumReply() {
        // JPA only
    }

    public ForumReply(
            ForumPost post,
            Organization organization,
            User author,
            String authorAlias,
            String content,
            ForumReplyStatus status
    ) {
        this.post = post;
        this.organization = organization;
        this.author = author;
        this.authorAlias = authorAlias;
        this.content = content;
        this.status = status != null ? status : ForumReplyStatus.PUBLISHED;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public ForumPost getPost() {
        return post;
    }

    public Organization getOrganization() {
        return organization;
    }

    public User getAuthor() {
        return author;
    }

    public String getAuthorAlias() {
        return authorAlias;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
        this.updatedAt = Instant.now();
        this.editedAt = Instant.now();
    }

    public ForumReplyStatus getStatus() {
        return status;
    }

    public void setStatus(ForumReplyStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getEditedAt() {
        return editedAt;
    }

    public Instant getModeratedAt() {
        return moderatedAt;
    }

    public String getModeratedBy() {
        return moderatedBy;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void moderate(ForumReplyStatus newStatus, String moderatorUsername, String reason) {
        this.status = newStatus;
        this.moderatedBy = moderatorUsername;
        this.moderationReason = reason;
        this.moderatedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean isPublished() {
        return this.status == ForumReplyStatus.PUBLISHED;
    }

    public boolean isHidden() {
        return this.status == ForumReplyStatus.HIDDEN;
    }

    public boolean isDeleted() {
        return this.status == ForumReplyStatus.DELETED;
    }
}
