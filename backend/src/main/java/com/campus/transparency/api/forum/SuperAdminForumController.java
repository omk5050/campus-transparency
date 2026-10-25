package com.campus.transparency.api.forum;

import com.campus.transparency.application.forum.ForumService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/super-admin/forum")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminForumController {

    private final ForumService forumService;

    public SuperAdminForumController(ForumService forumService) {
        this.forumService = forumService;
    }

    @GetMapping("/governance")
    public ForumGovernanceStatsResponse getGovernanceStats(
            @RequestParam(value = "organizationId", required = false) Long organizationId
    ) {
        return forumService.getGovernanceStats(organizationId);
    }

    @GetMapping("/moderation")
    public Page<ForumPostSummaryResponse> getPlatformModerationQueue(
            @RequestParam(value = "organizationId", required = false) Long organizationId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return forumService.getModerationQueue(organizationId, status, category, search, pageable);
    }

    @PostMapping("/posts/{postId}/publish")
    public ForumPostDetailResponse publishPost(@PathVariable("postId") Long postId) {
        return forumService.publishPost(postId);
    }

    @PostMapping("/posts/{postId}/hide")
    public ForumPostDetailResponse hidePost(
            @PathVariable("postId") Long postId,
            @RequestBody(required = false) ModerateForumRequest request
    ) {
        String reason = request != null ? request.reason() : null;
        return forumService.hidePost(postId, reason);
    }

    @PostMapping("/posts/{postId}/lock")
    public ForumPostDetailResponse lockPost(
            @PathVariable("postId") Long postId,
            @RequestBody(required = false) ModerateForumRequest request
    ) {
        String reason = request != null ? request.reason() : null;
        return forumService.lockPost(postId, reason);
    }

    @PostMapping("/posts/{postId}/unlock")
    public ForumPostDetailResponse unlockPost(@PathVariable("postId") Long postId) {
        return forumService.unlockPost(postId);
    }

    @PostMapping("/replies/{replyId}/hide")
    public ForumReplyResponse hideReply(
            @PathVariable("replyId") Long replyId,
            @RequestBody(required = false) ModerateForumRequest request
    ) {
        String reason = request != null ? request.reason() : null;
        return forumService.hideReply(replyId, reason);
    }

    @GetMapping("/audit-logs")
    public Page<ForumAuditLogResponse> getPlatformAuditLogs(
            @RequestParam(value = "organizationId", required = false) Long organizationId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return forumService.getForumAuditLogs(organizationId, pageable);
    }
}
