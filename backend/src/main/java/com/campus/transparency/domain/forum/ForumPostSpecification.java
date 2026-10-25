package com.campus.transparency.domain.forum;

import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;

public class ForumPostSpecification {

    public static Specification<ForumPost> belongsToOrganization(Long organizationId) {
        return (root, query, cb) -> organizationId == null
                ? null
                : cb.equal(root.get("organization").get("id"), organizationId);
    }

    public static Specification<ForumPost> hasStatusIn(Collection<ForumPostStatus> statuses) {
        return (root, query, cb) -> (statuses == null || statuses.isEmpty())
                ? null
                : root.get("status").in(statuses);
    }

    public static Specification<ForumPost> hasStatus(ForumPostStatus status) {
        return (root, query, cb) -> status == null
                ? null
                : cb.equal(root.get("status"), status);
    }

    public static Specification<ForumPost> hasCategory(ForumPostCategory category) {
        return (root, query, cb) -> category == null
                ? null
                : cb.equal(root.get("category"), category);
    }

    public static Specification<ForumPost> containsText(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return null;
            }
            String pattern = "%" + search.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("content")), pattern)
            );
        };
    }
}
