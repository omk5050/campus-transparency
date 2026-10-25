package com.campus.transparency.api.forum;

import com.campus.transparency.application.forum.ForumService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/forum")
@PreAuthorize("isAuthenticated()")
public class ForumController {

    private final ForumService forumService;

    public ForumController(ForumService forumService) {
        this.forumService = forumService;
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public ForumPostDetailResponse createPost(@Valid @RequestBody CreateForumPostRequest request) {
        return forumService.createPost(request);
    }

    @GetMapping("/posts")
    public Page<ForumPostSummaryResponse> getVisiblePosts(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        return forumService.getVisiblePostsForCurrentOrg(category, search, pageable);
    }

    @GetMapping("/posts/{postId}")
    public ForumPostDetailResponse getPostDetail(@PathVariable("postId") Long postId) {
        return forumService.getPostDetail(postId);
    }

    @PutMapping("/posts/{postId}")
    public ForumPostDetailResponse updatePost(
            @PathVariable("postId") Long postId,
            @Valid @RequestBody UpdateForumPostRequest request
    ) {
        return forumService.updatePost(postId, request);
    }

    @DeleteMapping("/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable("postId") Long postId) {
        forumService.deletePost(postId);
    }

    @PostMapping("/posts/{postId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public ForumReplyResponse createReply(
            @PathVariable("postId") Long postId,
            @Valid @RequestBody CreateForumReplyRequest request
    ) {
        return forumService.createReply(postId, request);
    }

    @GetMapping("/posts/{postId}/replies")
    public List<ForumReplyResponse> getReplies(@PathVariable("postId") Long postId) {
        return forumService.getRepliesForPost(postId);
    }

    @PutMapping("/replies/{replyId}")
    public ForumReplyResponse updateReply(
            @PathVariable("replyId") Long replyId,
            @Valid @RequestBody UpdateForumReplyRequest request
    ) {
        return forumService.updateReply(replyId, request);
    }

    @DeleteMapping("/replies/{replyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReply(@PathVariable("replyId") Long replyId) {
        forumService.deleteReply(replyId);
    }
}
