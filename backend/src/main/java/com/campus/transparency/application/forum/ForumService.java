package com.campus.transparency.application.forum;

import com.campus.transparency.api.forum.*;
import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.domain.forum.*;
import com.campus.transparency.domain.notification.NotificationType;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.jpa.domain.Specification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class ForumService {

    private final ForumPostRepository postRepository;
    private final ForumReplyRepository replyRepository;
    private final ForumAuditLogRepository auditLogRepository;
    private final OrganizationRepository organizationRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final ForumRateLimiter rateLimiter;

    public ForumService(
            ForumPostRepository postRepository,
            ForumReplyRepository replyRepository,
            ForumAuditLogRepository auditLogRepository,
            OrganizationRepository organizationRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            ForumRateLimiter rateLimiter
    ) {
        this.postRepository = postRepository;
        this.replyRepository = replyRepository;
        this.auditLogRepository = auditLogRepository;
        this.organizationRepository = organizationRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.rateLimiter = rateLimiter;
    }

    // =========================================================================
    // 1. PUBLIC FORUM BROWSING (UNAUTHENTICATED OR AUTHENTICATED)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<ForumPostSummaryResponse> getPublicPosts(
            Long organizationId,
            String categoryStr,
            String search,
            Pageable pageable
    ) {
        ForumPostCategory category = null;
        if (categoryStr != null && !categoryStr.trim().isEmpty()) {
            category = ForumPostCategory.fromString(categoryStr);
        }

        Specification<ForumPost> spec = Specification.where(
                ForumPostSpecification.hasStatusIn(List.of(ForumPostStatus.PUBLISHED, ForumPostStatus.LOCKED))
        )
        .and(ForumPostSpecification.belongsToOrganization(organizationId))
        .and(ForumPostSpecification.hasCategory(category))
        .and(ForumPostSpecification.containsText(search));

        Page<ForumPost> posts = postRepository.findAll(spec, pageable);

        return posts.map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public ForumPostDetailResponse getPublicPost(Long postId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        if (post.getStatus() != ForumPostStatus.PUBLISHED && post.getStatus() != ForumPostStatus.LOCKED) {
            throw new EntityNotFoundException("Forum post not found: " + postId);
        }

        return toDetailResponse(post, false);
    }

    @Transactional(readOnly = true)
    public List<ForumReplyResponse> getPublicReplies(Long postId) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        if (post.getStatus() != ForumPostStatus.PUBLISHED && post.getStatus() != ForumPostStatus.LOCKED) {
            throw new EntityNotFoundException("Forum post not found: " + postId);
        }

        List<ForumReply> replies = replyRepository.findByPostIdAndStatus(
                postId,
                ForumReplyStatus.PUBLISHED,
                Sort.by(Sort.Direction.ASC, "createdAt")
        );

        return replies.stream()
                .map(r -> toReplyResponse(r, false))
                .toList();
    }

    // =========================================================================
    // 2. AUTHENTICATED FORUM POST OPERATIONS
    // =========================================================================

    @Transactional
    public ForumPostDetailResponse createPost(CreateForumPostRequest request) {
        User author = currentUserService.getCurrentUser();
        if (author.getRole() != Role.SUPER_ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only SUPER_ADMIN is permitted to create forum posts"
            );
        }

        Organization organization;
        if (request.organizationId() != null) {
            organization = organizationRepository.findById(request.organizationId())
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException(
                            "Organization not found with id: " + request.organizationId()));
        } else if (author.getOrganization() != null) {
            organization = author.getOrganization();
        } else {
            organization = organizationRepository.findAll().stream()
                    .filter(o -> o.getStatus() == com.campus.transparency.domain.organization.OrganizationStatus.ACTIVE)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("No active organization found"));
        }

        // Enforce anti-spam rate limiting
        rateLimiter.checkPostRateLimit(author.getUsername());

        // Validate content
        if (request.title() == null || request.title().trim().isEmpty()) {
            throw new IllegalArgumentException("Post title is required and cannot be blank");
        }
        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Post content is required and cannot be blank");
        }
        ForumPostCategory category = ForumPostCategory.fromString(request.category());

        String safeAuthorAlias = generateForumMemberAlias(author);

        ForumPost post = new ForumPost(
                organization,
                author,
                safeAuthorAlias,
                request.title().trim(),
                request.content().trim(),
                category,
                ForumPostStatus.PUBLISHED
        );

        ForumPost saved = postRepository.save(post);

        // Record audit
        auditLogRepository.save(new ForumAuditLog(
                organization,
                author.getUsername(),
                ForumAuditAction.FORUM_POST_CREATED,
                "POST",
                saved.getId(),
                "Forum post created"
        ));

        return toDetailResponse(saved, true);
    }

    @Transactional(readOnly = true)
    public Page<ForumPostSummaryResponse> getVisiblePostsForCurrentOrg(
            String categoryStr,
            String search,
            Pageable pageable
    ) {
        return getVisiblePostsForCurrentOrg(null, categoryStr, search, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ForumPostSummaryResponse> getVisiblePostsForCurrentOrg(
            Long requestedOrgId,
            String categoryStr,
            String search,
            Pageable pageable
    ) {
        User user = currentUserService.getCurrentUser();
        Long orgId;
        if (user.getRole() == Role.SUPER_ADMIN) {
            orgId = requestedOrgId;
        } else {
            orgId = currentUserService.getCurrentOrganizationId();
        }

        ForumPostCategory category = null;
        if (categoryStr != null && !categoryStr.trim().isEmpty()) {
            category = ForumPostCategory.fromString(categoryStr);
        }

        Specification<ForumPost> spec = Specification.where(
                ForumPostSpecification.hasStatusIn(List.of(ForumPostStatus.PUBLISHED, ForumPostStatus.LOCKED))
        );

        if (orgId != null) {
            spec = spec.and(ForumPostSpecification.belongsToOrganization(orgId));
        }

        spec = spec.and(ForumPostSpecification.hasCategory(category))
                .and(ForumPostSpecification.containsText(search));

        Page<ForumPost> posts = postRepository.findAll(spec, pageable);

        return posts.map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public ForumPostDetailResponse getPostDetail(Long postId) {
        User user = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        boolean isSuperAdmin = user.getRole() == Role.SUPER_ADMIN;
        boolean isSameOrg = user.getOrganization() != null && user.getOrganization().getId().equals(post.getOrganization().getId());
        boolean isAuthor = post.getAuthor().getId().equals(user.getId());

        // Cross-tenant non-public post protection
        if (!isSuperAdmin && !isSameOrg) {
            // Cannot access non-public status of another organization
            if (post.getStatus() != ForumPostStatus.PUBLISHED && post.getStatus() != ForumPostStatus.LOCKED) {
                throw new EntityNotFoundException("Forum post not found: " + postId);
            }
        }

        if (post.getStatus() == ForumPostStatus.DELETED && !isAuthor && !isSuperAdmin && user.getRole() != Role.ADMIN) {
            throw new EntityNotFoundException("Forum post not found: " + postId);
        }

        if (post.getStatus() == ForumPostStatus.HIDDEN && !isAuthor && !isSuperAdmin && user.getRole() != Role.ADMIN) {
            throw new EntityNotFoundException("Forum post not found: " + postId);
        }

        return toDetailResponse(post, isAuthor);
    }

    @Transactional
    public ForumPostDetailResponse updatePost(Long postId, UpdateForumPostRequest request) {
        User user = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorized to edit this forum post");
        }

        if (post.isLocked()) {
            throw new IllegalStateException("Cannot edit a locked forum post");
        }

        if (post.isDeleted()) {
            throw new IllegalStateException("Cannot edit a deleted forum post");
        }

        if (request.title() == null || request.title().trim().isEmpty()) {
            throw new IllegalArgumentException("Post title cannot be blank");
        }
        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Post content cannot be blank");
        }

        post.setTitle(request.title().trim());
        post.setContent(request.content().trim());
        if (request.category() != null && !request.category().trim().isEmpty()) {
            post.setCategory(ForumPostCategory.fromString(request.category()));
        }

        ForumPost updated = postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                user.getUsername(),
                ForumAuditAction.FORUM_POST_EDITED,
                "POST",
                updated.getId(),
                "Forum post edited by author"
        ));

        return toDetailResponse(updated, true);
    }

    @Transactional
    public void deletePost(Long postId) {
        User user = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        boolean isAuthor = post.getAuthor().getId().equals(user.getId());
        boolean isOrgAdmin = user.getRole() == Role.ADMIN && user.getOrganization() != null && user.getOrganization().getId().equals(post.getOrganization().getId());
        boolean isSuperAdmin = user.getRole() == Role.SUPER_ADMIN;

        if (!isAuthor && !isOrgAdmin && !isSuperAdmin) {
            throw new AccessDeniedException("You do not have permission to delete this forum post");
        }

        post.setStatus(ForumPostStatus.DELETED);
        postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                user.getUsername(),
                ForumAuditAction.FORUM_POST_DELETED,
                "POST",
                post.getId(),
                "Forum post deleted"
        ));
    }

    // =========================================================================
    // 3. AUTHENTICATED FORUM REPLY OPERATIONS
    // =========================================================================

    @Transactional
    public ForumReplyResponse createReply(Long postId, CreateForumReplyRequest request) {
        User author = currentUserService.getCurrentUser();
        Organization userOrg = currentUserService.getCurrentOrganization();

        // Anti-spam check
        rateLimiter.checkReplyRateLimit(author.getUsername());

        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        // Strict tenant isolation: Caller must belong to the exact same organization as post
        if (!userOrg.getId().equals(post.getOrganization().getId())) {
            throw new AccessDeniedException("Cannot reply to a forum discussion belonging to another organization");
        }

        // Post state checks
        if (post.isLocked()) {
            throw new IllegalStateException("This discussion is locked and cannot receive new replies");
        }
        if (post.isDeleted() || post.isHidden()) {
            throw new EntityNotFoundException("Forum post not found: " + postId);
        }

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Reply content cannot be blank");
        }

        String safeAuthorAlias = generateForumMemberAlias(author);

        ForumReply reply = new ForumReply(
                post,
                post.getOrganization(),
                author,
                safeAuthorAlias,
                request.content().trim(),
                ForumReplyStatus.PUBLISHED
        );

        ForumReply saved = replyRepository.save(reply);

        // Audit reply
        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                author.getUsername(),
                ForumAuditAction.FORUM_REPLY_CREATED,
                "REPLY",
                saved.getId(),
                "Reply posted to post ID: " + post.getId()
        ));

        // Notification to post author (if not replying to self)
        if (!post.getAuthor().getId().equals(author.getId())) {
            notificationService.createNotification(
                    post.getAuthor(),
                    post.getOrganization(),
                    NotificationType.FORUM_REPLY_RECEIVED,
                    "New Reply on Forum Discussion",
                    "A community member replied to your discussion '" + post.getTitle() + "'",
                    "FORUM_POST",
                    post.getId()
            );
        }

        return toReplyResponse(saved, true);
    }

    @Transactional(readOnly = true)
    public List<ForumReplyResponse> getRepliesForPost(Long postId) {
        User user = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        boolean isSuperAdmin = user.getRole() == Role.SUPER_ADMIN;
        boolean isOrgAdmin = user.getRole() == Role.ADMIN && user.getOrganization() != null && user.getOrganization().getId().equals(post.getOrganization().getId());

        List<ForumReply> replies;
        if (isSuperAdmin || isOrgAdmin) {
            // Admins see all replies including hidden
            replies = replyRepository.findByPostIdAndStatusIn(
                    postId,
                    List.of(ForumReplyStatus.PUBLISHED, ForumReplyStatus.HIDDEN),
                    Sort.by(Sort.Direction.ASC, "createdAt")
            );
        } else {
            // Students only see published replies plus their own
            replies = replyRepository.findByPostId(postId, Sort.by(Sort.Direction.ASC, "createdAt"))
                    .stream()
                    .filter(r -> r.isPublished() || r.getAuthor().getId().equals(user.getId()))
                    .toList();
        }

        return replies.stream()
                .map(r -> toReplyResponse(r, r.getAuthor().getId().equals(user.getId())))
                .toList();
    }

    @Transactional
    public ForumReplyResponse updateReply(Long replyId, UpdateForumReplyRequest request) {
        User user = currentUserService.getCurrentUser();
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new EntityNotFoundException("Forum reply not found: " + replyId));

        if (!reply.getAuthor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You are not authorized to edit this reply");
        }

        if (reply.getPost().isLocked()) {
            throw new IllegalStateException("Cannot edit a reply in a locked discussion");
        }

        if (request.content() == null || request.content().trim().isEmpty()) {
            throw new IllegalArgumentException("Reply content cannot be blank");
        }

        reply.setContent(request.content().trim());
        ForumReply updated = replyRepository.save(reply);

        auditLogRepository.save(new ForumAuditLog(
                reply.getOrganization(),
                user.getUsername(),
                ForumAuditAction.FORUM_REPLY_EDITED,
                "REPLY",
                updated.getId(),
                "Forum reply edited by author"
        ));

        return toReplyResponse(updated, true);
    }

    @Transactional
    public void deleteReply(Long replyId) {
        User user = currentUserService.getCurrentUser();
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new EntityNotFoundException("Forum reply not found: " + replyId));

        boolean isAuthor = reply.getAuthor().getId().equals(user.getId());
        boolean isOrgAdmin = user.getRole() == Role.ADMIN && user.getOrganization() != null && user.getOrganization().getId().equals(reply.getOrganization().getId());
        boolean isSuperAdmin = user.getRole() == Role.SUPER_ADMIN;

        if (!isAuthor && !isOrgAdmin && !isSuperAdmin) {
            throw new AccessDeniedException("You do not have permission to delete this reply");
        }

        reply.setStatus(ForumReplyStatus.DELETED);
        replyRepository.save(reply);

        auditLogRepository.save(new ForumAuditLog(
                reply.getOrganization(),
                user.getUsername(),
                ForumAuditAction.FORUM_REPLY_DELETED,
                "REPLY",
                reply.getId(),
                "Forum reply deleted"
        ));
    }

    // =========================================================================
    // 4. MODERATION WORKFLOW (ORG ADMIN & SUPER ADMIN)
    // =========================================================================

    @Transactional
    public ForumPostDetailResponse publishPost(Long postId) {
        User moderator = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        verifyModeratorAuthority(moderator, post.getOrganization());

        post.moderate(ForumPostStatus.PUBLISHED, moderator.getUsername(), "Published by moderator");
        ForumPost saved = postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                moderator.getUsername(),
                ForumAuditAction.FORUM_POST_PUBLISHED,
                "POST",
                saved.getId(),
                "Post published"
        ));

        notificationService.createNotification(
                post.getAuthor(),
                post.getOrganization(),
                NotificationType.FORUM_POST_APPROVED,
                "Forum Post Published",
                "Your discussion '" + post.getTitle() + "' has been approved and published to the community",
                "FORUM_POST",
                post.getId()
        );

        return toDetailResponse(saved, false);
    }

    @Transactional
    public ForumPostDetailResponse hidePost(Long postId, String reason) {
        User moderator = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        verifyModeratorAuthority(moderator, post.getOrganization());

        post.moderate(ForumPostStatus.HIDDEN, moderator.getUsername(), reason);
        ForumPost saved = postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                moderator.getUsername(),
                ForumAuditAction.FORUM_POST_HIDDEN,
                "POST",
                saved.getId(),
                reason != null ? reason : "Post hidden by moderator"
        ));

        notificationService.createNotification(
                post.getAuthor(),
                post.getOrganization(),
                NotificationType.FORUM_POST_MODERATED,
                "Forum Post Moderated",
                "Your discussion '" + post.getTitle() + "' was hidden by moderation: " + (reason != null ? reason : "Community guidelines violation"),
                "FORUM_POST",
                post.getId()
        );

        return toDetailResponse(saved, false);
    }

    @Transactional
    public ForumPostDetailResponse lockPost(Long postId, String reason) {
        User moderator = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        verifyModeratorAuthority(moderator, post.getOrganization());

        post.moderate(ForumPostStatus.LOCKED, moderator.getUsername(), reason);
        ForumPost saved = postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                moderator.getUsername(),
                ForumAuditAction.FORUM_POST_LOCKED,
                "POST",
                saved.getId(),
                reason != null ? reason : "Discussion locked by moderator"
        ));

        return toDetailResponse(saved, false);
    }

    @Transactional
    public ForumPostDetailResponse unlockPost(Long postId) {
        User moderator = currentUserService.getCurrentUser();
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Forum post not found: " + postId));

        verifyModeratorAuthority(moderator, post.getOrganization());

        post.moderate(ForumPostStatus.PUBLISHED, moderator.getUsername(), "Discussion unlocked");
        ForumPost saved = postRepository.save(post);

        auditLogRepository.save(new ForumAuditLog(
                post.getOrganization(),
                moderator.getUsername(),
                ForumAuditAction.FORUM_POST_UNLOCKED,
                "POST",
                saved.getId(),
                "Discussion unlocked"
        ));

        return toDetailResponse(saved, false);
    }

    @Transactional
    public ForumReplyResponse hideReply(Long replyId, String reason) {
        User moderator = currentUserService.getCurrentUser();
        ForumReply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new EntityNotFoundException("Forum reply not found: " + replyId));

        verifyModeratorAuthority(moderator, reply.getOrganization());

        reply.moderate(ForumReplyStatus.HIDDEN, moderator.getUsername(), reason);
        ForumReply saved = replyRepository.save(reply);

        auditLogRepository.save(new ForumAuditLog(
                reply.getOrganization(),
                moderator.getUsername(),
                ForumAuditAction.FORUM_REPLY_HIDDEN,
                "REPLY",
                saved.getId(),
                reason != null ? reason : "Reply hidden by moderator"
        ));

        return toReplyResponse(saved, false);
    }

    // =========================================================================
    // 5. MODERATION QUEUE & AUDIT QUERIES
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<ForumPostSummaryResponse> getModerationQueue(
            Long orgIdFilter,
            String statusStr,
            String categoryStr,
            String search,
            Pageable pageable
    ) {
        User user = currentUserService.getCurrentUser();
        Long effectiveOrgId;

        if (user.getRole() == Role.SUPER_ADMIN) {
            effectiveOrgId = orgIdFilter;
        } else if (user.getRole() == Role.ADMIN) {
            effectiveOrgId = currentUserService.getCurrentOrganizationId();
        } else {
            throw new AccessDeniedException("Only administrators can view the forum moderation queue");
        }

        ForumPostStatus status = null;
        if (statusStr != null && !statusStr.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusStr.trim())) {
            status = ForumPostStatus.valueOf(statusStr.trim().toUpperCase());
        }

        ForumPostCategory category = null;
        if (categoryStr != null && !categoryStr.trim().isEmpty() && !"ALL".equalsIgnoreCase(categoryStr.trim())) {
            category = ForumPostCategory.fromString(categoryStr);
        }

        Specification<ForumPost> spec = Specification.where(
                ForumPostSpecification.belongsToOrganization(effectiveOrgId)
        )
        .and(ForumPostSpecification.hasStatus(status))
        .and(ForumPostSpecification.hasCategory(category))
        .and(ForumPostSpecification.containsText(search));

        Page<ForumPost> posts = postRepository.findAll(spec, pageable);

        return posts.map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public Page<ForumAuditLogResponse> getForumAuditLogs(Long orgIdFilter, Pageable pageable) {
        User user = currentUserService.getCurrentUser();

        Page<ForumAuditLog> logs;
        if (user.getRole() == Role.SUPER_ADMIN) {
            if (orgIdFilter != null) {
                logs = auditLogRepository.findByOrganizationIdOrderByCreatedAtDesc(orgIdFilter, pageable);
            } else {
                logs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
        } else if (user.getRole() == Role.ADMIN) {
            Long orgId = currentUserService.getCurrentOrganizationId();
            logs = auditLogRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId, pageable);
        } else {
            throw new AccessDeniedException("Only administrators can inspect forum audit records");
        }

        return logs.map(l -> new ForumAuditLogResponse(
                l.getId(),
                l.getOrganization().getId(),
                l.getActor(),
                l.getAction().name(),
                l.getTargetType(),
                l.getTargetId(),
                l.getReason(),
                l.getCreatedAt()
        ));
    }

    @Transactional(readOnly = true)
    public ForumGovernanceStatsResponse getGovernanceStats(Long orgIdFilter) {
        User user = currentUserService.getCurrentUser();
        if (user.getRole() != Role.SUPER_ADMIN && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only administrators can view governance statistics");
        }

        Long orgId = user.getRole() == Role.SUPER_ADMIN ? orgIdFilter : currentUserService.getCurrentOrganizationId();

        long totalPosts;
        long pendingReview;
        long published;
        long hidden;
        long locked;
        long replies;

        if (orgId != null) {
            totalPosts = postRepository.countByOrganizationId(orgId);
            pendingReview = postRepository.countByOrganizationIdAndStatus(orgId, ForumPostStatus.PENDING_REVIEW);
            published = postRepository.countByOrganizationIdAndStatus(orgId, ForumPostStatus.PUBLISHED);
            hidden = postRepository.countByOrganizationIdAndStatus(orgId, ForumPostStatus.HIDDEN);
            locked = postRepository.countByOrganizationIdAndStatus(orgId, ForumPostStatus.LOCKED);
            replies = replyRepository.countByOrganizationId(orgId);
        } else {
            totalPosts = postRepository.count();
            pendingReview = postRepository.countByStatus(ForumPostStatus.PENDING_REVIEW);
            published = postRepository.countByStatus(ForumPostStatus.PUBLISHED);
            hidden = postRepository.countByStatus(ForumPostStatus.HIDDEN);
            locked = postRepository.countByStatus(ForumPostStatus.LOCKED);
            replies = replyRepository.count();
        }

        return new ForumGovernanceStatsResponse(
                totalPosts,
                pendingReview,
                published,
                hidden,
                locked,
                replies
        );
    }

    // =========================================================================
    // HELPER METHODS & PRIVACY ENFORCEMENT
    // =========================================================================

    private void verifyModeratorAuthority(User user, Organization targetOrg) {
        if (user.getRole() == Role.SUPER_ADMIN) {
            return; // Platform-wide authority
        }
        if (user.getRole() == Role.ADMIN) {
            if (user.getOrganization() == null || !user.getOrganization().getId().equals(targetOrg.getId())) {
                throw new AccessDeniedException("Organization administrators cannot moderate forum content belonging to another institution");
            }
            return;
        }
        throw new AccessDeniedException("You do not have administrative permissions to moderate forum content");
    }

    /**
     * Generates a forum-specific safe public member pseudonym (e.g. Member #A73F).
     * Strictly decoupled from complaint pseudonyms (Complainant #XXXX).
     * Never exposes user email, real username, or database ID.
     */
    public String generateForumMemberAlias(User user) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(("forum_member_salt_p4_" + user.getId() + "_" + user.getUsername()).getBytes(StandardCharsets.UTF_8));
            String hex = String.format("%02X%02X", hash[0], hash[1]);
            return "Member #" + hex;
        } catch (Exception ex) {
            int code = Math.abs((user.getUsername() + user.getId()).hashCode()) % 0xFFFF;
            return "Member #" + String.format("%04X", code);
        }
    }

    private ForumPostSummaryResponse toSummaryResponse(ForumPost post) {
        long replyCount = replyRepository.countByPostIdAndStatus(post.getId(), ForumReplyStatus.PUBLISHED);
        String snippet = post.getContent().length() > 200
                ? post.getContent().substring(0, 197) + "..."
                : post.getContent();

        return new ForumPostSummaryResponse(
                post.getId(),
                post.getOrganization().getId(),
                post.getOrganization().getName(),
                post.getAuthorAlias(),
                post.getTitle(),
                snippet,
                post.getCategory().name(),
                post.getStatus().name(),
                replyCount,
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getEditedAt(),
                post.isLocked()
        );
    }

    private ForumPostDetailResponse toDetailResponse(ForumPost post, boolean isAuthor) {
        long replyCount = replyRepository.countByPostIdAndStatus(post.getId(), ForumReplyStatus.PUBLISHED);
        return new ForumPostDetailResponse(
                post.getId(),
                post.getOrganization().getId(),
                post.getOrganization().getName(),
                post.getAuthorAlias(),
                post.getTitle(),
                post.getContent(),
                post.getCategory().name(),
                post.getStatus().name(),
                replyCount,
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getEditedAt(),
                post.isLocked(),
                isAuthor,
                post.getModeratedAt(),
                post.getModerationReason()
        );
    }

    private ForumReplyResponse toReplyResponse(ForumReply reply, boolean isAuthor) {
        return new ForumReplyResponse(
                reply.getId(),
                reply.getPost().getId(),
                reply.getAuthorAlias(),
                reply.getContent(),
                reply.getStatus().name(),
                reply.getCreatedAt(),
                reply.getUpdatedAt(),
                reply.getEditedAt(),
                isAuthor
        );
    }
}
