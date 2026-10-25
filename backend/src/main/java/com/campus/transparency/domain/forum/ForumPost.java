package com.campus.transparency.domain.forum;

import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "forum_posts")
public class ForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "author_alias", nullable = false, length = 64)
    private String authorAlias;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ForumPostCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ForumPostStatus status = ForumPostStatus.PUBLISHED;

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

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ForumReply> replies = new ArrayList<>();

    protected ForumPost() {
        // JPA only
    }

    public ForumPost(
            Organization organization,
            User author,
            String authorAlias,
            String title,
            String content,
            ForumPostCategory category,
            ForumPostStatus status
    ) {
        this.organization = organization;
        this.author = author;
        this.authorAlias = authorAlias;
        this.title = title;
        this.content = content;
        this.category = category;
        this.status = status != null ? status : ForumPostStatus.PUBLISHED;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
        this.updatedAt = Instant.now();
        this.editedAt = Instant.now();
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
        this.updatedAt = Instant.now();
        this.editedAt = Instant.now();
    }

    public ForumPostCategory getCategory() {
        return category;
    }

    public void setCategory(ForumPostCategory category) {
        this.category = category;
        this.updatedAt = Instant.now();
    }

    public ForumPostStatus getStatus() {
        return status;
    }

    public void setStatus(ForumPostStatus status) {
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

    public List<ForumReply> getReplies() {
        return replies;
    }

    public void moderate(ForumPostStatus newStatus, String moderatorUsername, String reason) {
        this.status = newStatus;
        this.moderatedBy = moderatorUsername;
        this.moderationReason = reason;
        this.moderatedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean isLocked() {
        return this.status == ForumPostStatus.LOCKED;
    }

    public boolean isPublished() {
        return this.status == ForumPostStatus.PUBLISHED;
    }

    public boolean isHidden() {
        return this.status == ForumPostStatus.HIDDEN;
    }

    public boolean isDeleted() {
        return this.status == ForumPostStatus.DELETED;
    }
}
