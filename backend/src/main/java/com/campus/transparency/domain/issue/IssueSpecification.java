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

    public static Specification<Issue> hasDepartment(String department) {
        return (root, query, cb) -> (department == null || department.isBlank())
                ? null
                : cb.equal(root.get("department"), department);
    }

    public static Specification<Issue> assignedToUser(Long userId) {
        return (root, query, cb) -> userId == null
                ? null
                : cb.equal(root.get("assignedTo").get("id"), userId);
    }

    public static Specification<Issue> isUnassigned() {
        return (root, query, cb) -> cb.isNull(root.get("assignedTo"));
    }

    public static Specification<Issue> belongsToOrganization(Long organizationId) {
        return (root, query, cb) -> organizationId == null
                ? null
                : cb.equal(root.get("organization").get("id"), organizationId);
    }

    public static Specification<Issue> reportedByUser(Long userId) {
        return (root, query, cb) -> userId == null
                ? null
                : cb.equal(root.get("reporter").get("id"), userId);
    }
}
