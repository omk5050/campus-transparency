package com.campus.transparency.api.statistics;

import com.campus.transparency.domain.organization.OrganizationType;

public record LeaderboardEntryResponse(
        int rank,
        Long organizationId,
        String organizationName,
        OrganizationType organizationType,
        double ethosScore,
        double resolutionRate,
        double averageResolutionHours,
        double medianResolutionHours,
        long totalEligibleComplaints,
        long totalComplaints,
        long resolvedComplaints,
        String qualificationStatus
) {}
