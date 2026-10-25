package com.campus.transparency.api.issue;

import java.util.Collections;
import java.util.Map;

public record OrganizationMetricsResponse(
        long totalComplaints,
        long reportedComplaints,
        long inProgressComplaints,
        long resolvedComplaints,
        long rejectedComplaints,
        long assignedCases,
        long unassignedCases,
        double resolutionRate,
        double averageResolutionHours,
        double medianResolutionHours,
        double ethosScore,
        String qualificationStatus,
        Map<String, Long> complaintsByCategory,
        Map<String, Long> complaintsByDepartment,
        String period
) {
    public OrganizationMetricsResponse(
            long totalComplaints,
            long reportedComplaints,
            long inProgressComplaints,
            long resolvedComplaints,
            long rejectedComplaints,
            long assignedCases,
            long unassignedCases
    ) {
        this(
                totalComplaints,
                reportedComplaints,
                inProgressComplaints,
                resolvedComplaints,
                rejectedComplaints,
                assignedCases,
                unassignedCases,
                0.0,
                0.0,
                0.0,
                0.0,
                "PROVISIONAL",
                Collections.emptyMap(),
                Collections.emptyMap(),
                "ALL_TIME"
        );
    }
}
