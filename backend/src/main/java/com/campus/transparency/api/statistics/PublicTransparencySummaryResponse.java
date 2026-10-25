package com.campus.transparency.api.statistics;

import java.util.List;

public record PublicTransparencySummaryResponse(
        long totalOrganizations,
        long activeOrganizations,
        long totalComplaintsPlatform,
        long resolvedComplaintsPlatform,
        double platformResolutionRate,
        double platformAverageResolutionHours,
        double platformMedianResolutionHours,
        List<LeaderboardEntryResponse> leaderboard
) {}
