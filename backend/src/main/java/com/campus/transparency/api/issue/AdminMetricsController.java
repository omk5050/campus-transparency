package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueQueryService;
import com.campus.transparency.application.statistics.OrganizationStatisticsService;
import com.campus.transparency.domain.statistics.TimePeriod;
import com.campus.transparency.security.CurrentUserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AdminMetricsController {

    private final OrganizationStatisticsService statisticsService;
    private final CurrentUserService currentUserService;
    private final IssueQueryService queryService;

    public AdminMetricsController(
            OrganizationStatisticsService statisticsService,
            CurrentUserService currentUserService,
            IssueQueryService queryService
    ) {
        this.statisticsService = statisticsService;
        this.currentUserService = currentUserService;
        this.queryService = queryService;
    }

    @GetMapping("/admin/metrics")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public OrganizationMetricsResponse getOrganizationMetrics(
            @RequestParam(value = "period", required = false) String period
    ) {
        Long orgId = currentUserService.getCurrentOrganizationId();
        TimePeriod timePeriod = TimePeriod.fromString(period);
        return statisticsService.calculateOrganizationMetrics(orgId, timePeriod);
    }

    @GetMapping("/super-admin/metrics")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PlatformMetricsResponse getPlatformMetrics() {
        return queryService.getPlatformMetrics();
    }
}
