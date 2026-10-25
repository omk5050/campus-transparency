package com.campus.transparency.api.issue;

public record OrganizationMetricsResponse(
        long totalComplaints,
        long reportedComplaints,
        long inProgressComplaints,
        long resolvedComplaints,
        long rejectedComplaints,
        long assignedCases,
        long unassignedCases
) {}
