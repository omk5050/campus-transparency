package com.campus.transparency.api.forum;

import com.campus.transparency.application.forum.ForumService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/forum")
public class PublicForumController {

    private final ForumService forumService;

    public PublicForumController(ForumService forumService) {
        this.forumService = forumService;
    }

    @GetMapping
    public Page<ForumPostSummaryResponse> getPublicPosts(
            @RequestParam(value = "organizationId", required = false) Long organizationId,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        Sort sorting = Sort.by(Sort.Direction.DESC, "createdAt");
        if (sort != null && sort.contains(",")) {
            String[] parts = sort.split(",");
            sorting = Sort.by(Sort.Direction.fromString(parts[1]), parts[0]);
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), sorting);
        return forumService.getPublicPosts(organizationId, category, search, pageable);
    }

    @GetMapping("/{postId}")
    public ForumPostDetailResponse getPublicPost(@PathVariable("postId") Long postId) {
        return forumService.getPublicPost(postId);
    }

    @GetMapping("/{postId}/replies")
    public List<ForumReplyResponse> getPublicReplies(@PathVariable("postId") Long postId) {
        return forumService.getPublicReplies(postId);
    }
}
