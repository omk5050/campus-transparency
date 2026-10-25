package com.campus.transparency.api.issue;

public record PlatformMetricsResponse(
        long totalOrganizations,
        long activeOrganizations,
        long suspendedOrganizations,
        long pendingApplications,
        long totalComplaints
) {}
