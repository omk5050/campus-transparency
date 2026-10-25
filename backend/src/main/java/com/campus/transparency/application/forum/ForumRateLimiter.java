package com.campus.transparency.application.forum;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ForumRateLimiter {

    private final Map<String, Bucket> postBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> replyBuckets = new ConcurrentHashMap<>();

    public void checkPostRateLimit(String username) {
        Bucket bucket = postBuckets.computeIfAbsent(username, k -> createPostBucket());
        if (!bucket.tryConsume(1)) {
            throw new ForumRateLimitException("Post rate limit exceeded. Maximum 5 posts per hour.");
        }
    }

    public void checkReplyRateLimit(String username) {
        Bucket bucket = replyBuckets.computeIfAbsent(username, k -> createReplyBucket());
        if (!bucket.tryConsume(1)) {
            throw new ForumRateLimitException("Reply rate limit exceeded. Maximum 20 replies per hour.");
        }
    }

    public void reset() {
        postBuckets.clear();
        replyBuckets.clear();
    }

    private Bucket createPostBucket() {
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createReplyBucket() {
        Bandwidth limit = Bandwidth.classic(20, Refill.greedy(20, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
