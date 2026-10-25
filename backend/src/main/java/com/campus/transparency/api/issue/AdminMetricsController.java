package com.campus.transparency.api.issue;

import com.campus.transparency.application.issue.IssueQueryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AdminMetricsController {

    private final IssueQueryService queryService;

    public AdminMetricsController(IssueQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/admin/metrics")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public OrganizationMetricsResponse getOrganizationMetrics() {
        return queryService.getOrganizationMetrics();
    }

    @GetMapping("/super-admin/metrics")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PlatformMetricsResponse getPlatformMetrics() {
        return queryService.getPlatformMetrics();
    }
}
