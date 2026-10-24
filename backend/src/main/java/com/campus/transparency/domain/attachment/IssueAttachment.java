package com.campus.transparency.domain.attachment;

import com.campus.transparency.domain.base.BaseEntity;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "issue_attachments")
public class IssueAttachment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "cloudinary_public_id", nullable = false, length = 255)
    private String cloudinaryPublicId;

    @Column(name = "secure_url", nullable = false, length = 1000)
    private String secureUrl;

    @Column(name = "resource_type", nullable = false, length = 64)
    private String resourceType = "image";

    @Column(length = 32)
    private String format;

    @Column(nullable = false)
    private Long bytes;

    private Integer width;

    private Integer height;

    protected IssueAttachment() {
        // JPA only
    }

    public IssueAttachment(
            Issue issue,
            Organization organization,
            User uploadedBy,
            String originalFilename,
            String cloudinaryPublicId,
            String secureUrl,
            String resourceType,
            String format,
            Long bytes,
            Integer width,
            Integer height
    ) {
        this.issue = issue;
        this.organization = organization;
        this.uploadedBy = uploadedBy;
        this.originalFilename = originalFilename;
        this.cloudinaryPublicId = cloudinaryPublicId;
        this.secureUrl = secureUrl;
        this.resourceType = resourceType != null ? resourceType : "image";
        this.format = format;
        this.bytes = bytes;
        this.width = width;
        this.height = height;
    }

    public Issue getIssue() {
        return issue;
    }

    public Organization getOrganization() {
        return organization;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getCloudinaryPublicId() {
        return cloudinaryPublicId;
    }

    public String getSecureUrl() {
        return secureUrl;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getFormat() {
        return format;
    }

    public Long getBytes() {
        return bytes;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }
}
