package com.campus.transparency.api.forum;

public record ForumGovernanceStatsResponse(
        long totalPosts,
        long pendingReview,
        long publishedPosts,
        long hiddenPosts,
        long lockedPosts,
        long totalReplies
) {}
