package com.campus.transparency.domain.issue;

import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public class IssueSpecification {

    public static Specification<Issue> isNotHidden() {
        return (root, query, cb) -> cb.equal(root.get("hidden"), false);
    }

    public static Specification<Issue> hasStatus(IssueStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Issue> createdAfter(Instant startDate) {
        return (root, query, cb) -> startDate == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
    }

    public static Specification<Issue> createdBefore(Instant endDate) {
        return (root, query, cb) -> endDate == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), endDate);
    }
}
