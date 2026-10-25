package com.campus.transparency.api.statistics;

import com.campus.transparency.application.statistics.OrganizationStatisticsService;
import com.campus.transparency.domain.statistics.TimePeriod;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicTransparencyController {

    private final OrganizationStatisticsService statisticsService;

    public PublicTransparencyController(OrganizationStatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/leaderboard")
    public List<LeaderboardEntryResponse> getLeaderboard(@RequestParam(value = "period", required = false) String period) {
        TimePeriod timePeriod = TimePeriod.fromString(period);
        return statisticsService.getLeaderboard(timePeriod);
    }

    @GetMapping("/transparency")
    public PublicTransparencySummaryResponse getPublicTransparency(@RequestParam(value = "period", required = false) String period) {
        TimePeriod timePeriod = TimePeriod.fromString(period);
        return statisticsService.getPublicTransparencySummary(timePeriod);
    }

    @GetMapping("/organizations/{id}/transparency")
    public OrganizationTransparencyProfileResponse getOrganizationTransparencyProfile(
            @PathVariable("id") Long id,
            @RequestParam(value = "period", required = false) String period
    ) {
        TimePeriod timePeriod = TimePeriod.fromString(period);
        return statisticsService.getOrganizationTransparencyProfile(id, timePeriod);
    }
}
